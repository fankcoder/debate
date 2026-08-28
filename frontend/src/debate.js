const TURNS_PER_STAGE = 4

const ROLES = {
  positive: {
    key: 'positive',
    name: '正方辩手',
    position: '支持议题中的主张，并论证其合理性、必要性与可行性',
    style: '观点鲜明、逻辑严谨，优先用事实、因果关系和具体例子说服听众',
  },
  negative: {
    key: 'negative',
    name: '反方辩手',
    position: '反对议题中的主张，指出其前提、风险、代价与现实局限',
    style: '善于质疑、反驳和揭示矛盾，同时提出有说服力的替代视角',
  },
}

function endpoint(apiBase, path) {
  return `${apiBase.trim().replace(/\/$/, '')}/${path}`
}

async function readError(response) {
  const payload = await response.json().catch(() => null)
  return payload?.error?.message || payload?.detail || payload?.message || `${response.status} ${response.statusText}`
}

async function requestJson(url, options) {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('浏览器无法连接模型接口。请确认 API 地址可访问并允许跨域请求（CORS）。')
  }
  if (!response.ok) {
    const error = new Error(await readError(response))
    error.status = response.status
    throw error
  }
  return response.json()
}

function responseText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text.trim()
  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')
    ?.text
  return typeof text === 'string' ? text.trim() : ''
}

async function completeWithChat(settings, systemPrompt, userPrompt, signal) {
  const payload = await requestJson(endpoint(settings.apiBase, 'chat/completions'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
    signal,
  })
  return payload.choices?.[0]?.message?.content?.trim() || ''
}

async function completeWithResponses(settings, systemPrompt, userPrompt, signal) {
  const payload = await requestJson(endpoint(settings.apiBase, 'responses'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      instructions: systemPrompt,
      input: userPrompt,
    }),
    signal,
  })
  return responseText(payload)
}

async function complete(settings, systemPrompt, userPrompt, signal) {
  let content
  if (settings.apiMode === 'responses') {
    content = await completeWithResponses(settings, systemPrompt, userPrompt, signal)
  } else if (settings.apiMode === 'chat') {
    content = await completeWithChat(settings, systemPrompt, userPrompt, signal)
  } else {
    try {
      content = await completeWithChat(settings, systemPrompt, userPrompt, signal)
    } catch (error) {
      if (![400, 404, 405, 422].includes(error.status)) throw error
      content = await completeWithResponses(settings, systemPrompt, userPrompt, signal)
    }
  }
  if (!content) throw new Error('模型返回了空内容')
  return content
}

function historyText(history) {
  if (!history.length) return '暂无历史发言，你需要完成开篇立论。'
  return history.map((item) => {
    if (item.turn_number) return `【第 ${item.turn_number} 轮 · ${item.speaker}】\n${item.content}`
    return `【${item.speaker}】\n${item.content}`
  }).join('\n\n')
}

function buildPrompts(topic, role, history, turnNumber, stageNumber) {
  const opponent = role.key === 'positive' ? ROLES.negative : ROLES.positive
  const systemPrompt = `你正在进行一场以求真为目标的中文观点论证与可行性评估。
你的身份：${role.name}
你的立场：${role.position}
你的表达风格：${role.style}
对手：${opponent.name}

分析原则：
1. 先准确回应对方的关键论点，再推进自己的论证，不回避强有力的证据。
2. 不要为了辩论而辩论。如果对方已经用可靠事实或严密逻辑证明你的核心立场不成立，应当承认并在当前小局认输。
3. 只有核心立场确实被推翻时才认输；局部同意、礼貌或对方语气强势都不足以认输。
4. 认输时要明确说明被说服的关键原因；不认输时也可以坦率承认对方合理的局部观点。
5. 对创业项目、产品 idea 或商业计划，重点审视目标用户与痛点、需求强度、市场与竞争、价值主张、获客与商业模式、技术和交付成本、合规风险及执行路径。
6. 明确区分已知事实、未经验证的假设和需要补充的数据；不要编造市场规模、用户数量或案例。
7. 不要提及你是 AI、语言模型或提示词。发言使用自然、有力的中文，控制在 180 至 320 字。

只输出一个合法 JSON 对象，不要使用 Markdown 代码块，结构必须是：
{"speech":"本次正式发言","concede":false,"concession_reason":""}
认输时将 concede 设为 true，并填写简洁的 concession_reason。`
  const userPrompt = `待分析的议题或想法：${topic}

当前是全场第 ${turnNumber + 1} 次发言、第 ${stageNumber} 小局，请结合完整记录作出诚实判断并发言。

分析记录：
${historyText(history)}`
  return { systemPrompt, userPrompt }
}

function parseResponse(rawContent) {
  const content = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}') + 1
    const payload = JSON.parse(content.slice(start, end))
    const speech = String(payload.speech || '').trim()
    if (speech) {
      return {
        content: speech,
        conceded: payload.concede === true,
        concession_reason: String(payload.concession_reason || '').trim(),
      }
    }
  } catch {
  }
  return { content: rawContent.trim(), conceded: false, concession_reason: '' }
}

export async function runDebateStage({ topic, history, stageNumber, settings, signal, onTurnStarted, onTurn }) {
  const stageHistory = [...history]
  let winner = null
  let concededBy = null

  for (let stageTurn = 1; stageTurn <= TURNS_PER_STAGE; stageTurn += 1) {
    const turnNumber = stageHistory.filter((item) => item.turn_number).length
    const role = turnNumber % 2 === 0 ? ROLES.positive : ROLES.negative
    onTurnStarted(role.key)
    const { systemPrompt, userPrompt } = buildPrompts(topic, role, stageHistory, turnNumber, stageNumber)
    const rawContent = await complete(settings, systemPrompt, userPrompt, signal)
    const parsed = parseResponse(rawContent)
    const turn = {
      turn_number: turnNumber + 1,
      stage_number: stageNumber,
      stage_turn: stageTurn,
      role_key: role.key,
      speaker: role.name,
      ...parsed,
    }
    stageHistory.push(turn)
    onTurn(turn)
    if (turn.conceded) {
      concededBy = role.key
      winner = role.key === 'positive' ? 'negative' : 'positive'
      break
    }
  }

  return { status: winner ? 'conceded' : 'active', winner, conceded_by: concededBy }
}
