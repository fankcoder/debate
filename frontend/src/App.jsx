import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BrainCircuit, CheckCircle2, ChevronRight, CircleStop, Eye, EyeOff,
  Gavel, KeyRound, LoaderCircle, MessageSquareQuote, Plus, RotateCcw, Scale, Send,
  Settings, ShieldCheck, Sparkles, Trophy, X,
} from 'lucide-react'
import { runDebateStage } from './debate.js'

const EXAMPLE_TOPICS = [
  '帮我评估：面向独居老人的 AI 陪伴产品是否值得创业？',
  '这个 SaaS 创业想法的用户需求和商业模式靠谱吗？',
  '做一个帮助小商家自动生成短视频的 AI 工具，有真实需求吗？',
  '社区共享厨房项目能否兼顾食品安全和盈利？',
  '面向自由职业者的一站式财税产品值得做吗？',
  '人工智能是否应该全面进入中小学课堂？',
]
const EMPTY_SETTINGS = { apiBase: '', model: '', apiKey: '', apiMode: 'auto' }
const MODEL_PRESETS = [
  {
    key: 'openai',
    name: 'OpenAI',
    apiBase: 'https://api.openai.com/v1',
    apiMode: 'responses',
    models: ['gpt-5.4', 'gpt-4.1', 'gpt-4o-mini'],
  },
  {
    key: 'deepseek',
    name: 'DeepSeek',
    apiBase: 'https://api.deepseek.com',
    apiMode: 'chat',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
  },
  {
    key: 'qwen',
    name: '阿里云百炼 / 通义千问',
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiMode: 'chat',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
  },
  {
    key: 'siliconflow',
    name: 'SiliconFlow',
    apiBase: 'https://api.siliconflow.cn/v1',
    apiMode: 'chat',
    models: ['deepseek-ai/DeepSeek-V3.2', 'Qwen/Qwen3-8B', 'Qwen/Qwen3-32B'],
  },
  {
    key: 'moonshot',
    name: 'Moonshot / Kimi',
    apiBase: 'https://api.moonshot.cn/v1',
    apiMode: 'chat',
    models: ['kimi-k2.5', 'moonshot-v1-8k', 'moonshot-v1-32k'],
  },
  {
    key: 'zhipu',
    name: '智谱 AI',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    apiMode: 'chat',
    models: ['glm-4.5-air', 'glm-4-flash', 'glm-4-plus'],
  },
  {
    key: 'openrouter',
    name: 'OpenRouter',
    apiBase: 'https://openrouter.ai/api/v1',
    apiMode: 'chat',
    models: ['deepseek/deepseek-chat', 'google/gemini-2.5-flash', 'openai/gpt-4o-mini'],
  },
]
const CUSTOM_PROVIDER_KEY = 'custom'
const ROLE_META = {
  positive: { name: '正方', label: '主张成立', initial: '正', className: 'positive' },
  negative: { name: '反方', label: '主张不成立', initial: '反', className: 'negative' },
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><Scale size={22} strokeWidth={1.8} /></div>
      <div><strong>知辩</strong><span>AI</span><small>让想法经得起推敲</small></div>
    </div>
  )
}

function Modal({ title, subtitle, icon, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div className="modal-title-icon">{icon}</div>
          <div><h3>{title}</h3><p>{subtitle}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function LlmSettingsModal({ value, onSave, onClose }) {
  const [draft, setDraft] = useState(value)
  const [showKey, setShowKey] = useState(false)
  const initialPreset = MODEL_PRESETS.find((preset) => preset.apiBase === value.apiBase && preset.models.includes(value.model))
  const [providerKey, setProviderKey] = useState(initialPreset?.key || CUSTOM_PROVIDER_KEY)
  const [modelPreset, setModelPreset] = useState(initialPreset?.models.includes(value.model) ? value.model : CUSTOM_PROVIDER_KEY)
  const complete = draft.apiBase.trim() && draft.model.trim() && draft.apiKey.trim()
  const update = (field, nextValue) => setDraft((current) => ({ ...current, [field]: nextValue }))

  function selectProvider(nextProviderKey) {
    setProviderKey(nextProviderKey)
    const preset = MODEL_PRESETS.find((item) => item.key === nextProviderKey)
    if (!preset) {
      setModelPreset(CUSTOM_PROVIDER_KEY)
      setDraft((current) => ({ ...current, apiBase: '', model: '', apiMode: 'auto' }))
      return
    }
    const nextModel = preset.models[0]
    setModelPreset(nextModel)
    setDraft((current) => ({ ...current, apiBase: preset.apiBase, model: nextModel, apiMode: preset.apiMode }))
  }

  function selectModel(nextModel) {
    setModelPreset(nextModel)
    const preset = MODEL_PRESETS.find((item) => item.key === providerKey)
    if (nextModel === CUSTOM_PROVIDER_KEY) {
      update('model', '')
    } else if (preset) {
      update('model', nextModel)
    }
  }

  return (
    <Modal title="连接模型" subtitle="页面会从浏览器直接调用你的 OpenAI 兼容接口。" icon={<KeyRound size={20} />} onClose={onClose}>
      <div className="security-note">
        <ShieldCheck size={17} />
        <span>API Key 仅保存在当前浏览器会话缓存中，关闭标签后清除，本项目不会将其上传到自有服务器，可降低泄漏风险。<br />代码开源地址：<a href="https://github.com/fankcoder/debate" target="_blank" rel="noreferrer">https://github.com/fankcoder/debate</a></span>
      </div>
      <label className="field-label">服务商
        <select value={providerKey} onChange={(event) => selectProvider(event.target.value)}>
          {MODEL_PRESETS.map((preset) => <option key={preset.key} value={preset.key}>{preset.name}</option>)}
          <option value={CUSTOM_PROVIDER_KEY}>自定义服务商</option>
        </select>
      </label>
      {providerKey === CUSTOM_PROVIDER_KEY && <label className="field-label">API 地址<input value={draft.apiBase} onChange={(event) => update('apiBase', event.target.value)} placeholder="https://api.example.com/v1" /></label>}
      {providerKey !== CUSTOM_PROVIDER_KEY && <div className="preset-endpoint">API 地址：{draft.apiBase}</div>}
      <label className="field-label">模型名称
        <select value={modelPreset} onChange={(event) => selectModel(event.target.value)}>
          {(MODEL_PRESETS.find((preset) => preset.key === providerKey)?.models || []).map((model) => <option key={model} value={model}>{model}</option>)}
          <option value={CUSTOM_PROVIDER_KEY}>自定义模型</option>
        </select>
        {modelPreset === CUSTOM_PROVIDER_KEY && <input className="standalone-input" value={draft.model} onChange={(event) => update('model', event.target.value)} placeholder="填写模型名称" />}
      </label>
      <label className="field-label">API Key
        <div className="password-field">
          <input type={showKey ? 'text' : 'password'} value={draft.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder="sk-..." autoComplete="off" />
          <button type="button" onClick={() => setShowKey((current) => !current)} aria-label={showKey ? '隐藏密钥' : '显示密钥'}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
      </label>
      <label className="field-label">接口协议
        <select value={draft.apiMode} onChange={(event) => update('apiMode', event.target.value)}>
          <option value="auto">自动识别</option><option value="chat">Chat Completions</option><option value="responses">Responses</option>
        </select>
      </label>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={!complete} onClick={() => onSave(draft)}>保存配置</button></div>
    </Modal>
  )
}

function EmptyState({ onUseTopic }) {
  return (
    <main className="empty-state">
      <div className="hero-badge"><Sparkles size={14} /> AI 观点与想法评估室</div>
      <h1>先把想法说清楚，<br /><em>再判断它是否站得住。</em></h1>
      <p>无论是公共议题、创业项目，还是一个刚冒出来的产品 idea，都可以交给两种 AI 视角来审视。它们会分别寻找成立依据与关键风险，帮你区分事实、假设和仍需验证的地方。</p>
      <div className="example-section">
        <span>试试这些问题</span>
        <div className="topic-chips">
          {EXAMPLE_TOPICS.map((topic) => <button key={topic} onClick={() => onUseTopic(topic)}>{topic}<ChevronRight size={15} /></button>)}
        </div>
      </div>
      <div className="principles">
        <div><BrainCircuit size={19} /><span><strong>拆解假设</strong>把想法还原成可验证的判断</span></div>
        <div><Scale size={19} /><span><strong>双向审视</strong>同时寻找机会、证据与风险</span></div>
        <div><MessageSquareQuote size={19} /><span><strong>持续追问</strong>每四轮根据你的补充继续分析</span></div>
      </div>
    </main>
  )
}

function TurnCard({ turn }) {
  const role = ROLE_META[turn.role_key]
  return (
    <article className={`turn-card ${role.className} ${turn.conceded ? 'is-conceded' : ''}`}>
      <div className="turn-rail"><span>{role.initial}</span><i /></div>
      <div className="turn-content">
        <header><div><strong>{role.name}辩手</strong><span>{role.label}</span></div><time>第 {turn.turn_number} 轮</time></header>
        <p>{turn.content}</p>
        {turn.conceded && <div className="concession-inline"><CircleStop size={17} /><span><strong>本局认输</strong>{turn.concession_reason || '核心立场已被对方说服'}</span></div>}
      </div>
    </article>
  )
}

function ThinkingCard({ roleKey }) {
  const role = ROLE_META[roleKey]
  return (
    <article className={`turn-card thinking ${role.className}`}>
      <div className="turn-rail"><span>{role.initial}</span><i /></div>
      <div className="turn-content">
        <header><div><strong>{role.name}辩手</strong><span>正在审视论点</span></div></header>
        <div className="thinking-line"><LoaderCircle size={17} className="spin" />梳理证据与对方的核心主张…</div>
      </div>
    </article>
  )
}

function StageResult({ status, winner, stageNumber }) {
  const conceded = status === 'conceded'
  const winnerMeta = winner ? ROLE_META[winner] : null
  return (
    <section className={`stage-result ${conceded ? 'has-winner' : ''}`}>
      <div className="result-icon">{conceded ? <Trophy size={22} /> : <CheckCircle2 size={22} />}</div>
      <div>
        <small>第 {stageNumber} 小局结束</small>
        <strong>{conceded ? `${winnerMeta?.name || ''}观点胜出` : '双方仍各有可辩之处'}</strong>
        <p>{conceded ? '另一方认可关键论证并主动认输。' : '你可以补充事实、限定讨论范围，或直接进入下一小局。'}</p>
      </div>
    </section>
  )
}

function DebateView({ room, events, thinkingRole, running, stageResult, onNextStage, onReset }) {
  const [guidance, setGuidance] = useState('')
  const endRef = useRef(null)
  const turns = events.filter((item) => item.turn_number)
  const stageNumber = Math.max(room.stage_number || 0, ...turns.map((turn) => turn.stage_number || 0))

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, thinkingRole, stageResult])

  function continueDebate() {
    onNextStage(guidance)
    setGuidance('')
  }

  return (
    <main className="debate-view">
      <div className="debate-topbar">
        <div><span className="live-dot" /><span>{running ? '辩论进行中' : '等待主持人'}</span><i /><span>第 {stageNumber || 1} 小局</span></div>
        <button className="ghost-button" onClick={onReset}><RotateCcw size={15} /> 新建议题</button>
      </div>
      <section className="topic-header">
        <div className="topic-kicker"><Gavel size={15} /> 当前评估对象</div>
        <h2>{room.topic}</h2>
        <div className="side-legend"><span><i className="positive-dot" />支持视角：寻找成立依据</span><span><i className="negative-dot" />质疑视角：识别风险与盲点</span></div>
      </section>
      <section className="transcript">
        {turns.map((turn) => <TurnCard key={turn.turn_number} turn={turn} />)}
        {thinkingRole && <ThinkingCard roleKey={thinkingRole} />}
        {stageResult && !running && <StageResult status={stageResult.status} winner={stageResult.winner} stageNumber={stageNumber} />}
        <div ref={endRef} />
      </section>
      <section className={`moderator-box ${running ? 'disabled' : ''}`}>
        <div className="moderator-heading"><div><Sparkles size={17} /><strong>补充信息</strong></div><span>{running ? '请等待本轮完成' : '可选'}</span></div>
        <textarea value={guidance} onChange={(event) => setGuidance(event.target.value)} placeholder="补充目标用户、数据、预算、竞品或你最担心的问题…" disabled={running} maxLength={1000} />
        <div className="moderator-actions"><span>{guidance.length} / 1000</span><button onClick={continueDebate} disabled={running}>继续评估<ArrowRight size={17} /></button></div>
      </section>
    </main>
  )
}

function loadSettings() {
  try {
    return JSON.parse(sessionStorage.getItem('zhibian_llm_settings')) || EMPTY_SETTINGS
  } catch {
    return EMPTY_SETTINGS
  }
}

function App() {
  const [topic, setTopic] = useState('')
  const [room, setRoom] = useState(null)
  const [events, setEvents] = useState([])
  const [running, setRunning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [thinkingRole, setThinkingRole] = useState(null)
  const [stageResult, setStageResult] = useState(null)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [llmSettings, setLlmSettings] = useState(loadSettings)
  const abortControllerRef = useRef(null)

  const statusText = useMemo(() => {
    if (llmSettings.apiKey && llmSettings.apiBase && llmSettings.model) return `${llmSettings.model} · 直接分析`
    return '请配置模型'
  }, [llmSettings])

  function saveLlmSettings(nextSettings) {
    const normalized = { ...nextSettings, apiBase: nextSettings.apiBase.trim().replace(/\/$/, ''), model: nextSettings.model.trim() }
    setLlmSettings(normalized)
    sessionStorage.setItem('zhibian_llm_settings', JSON.stringify(normalized))
    setSettingsOpen(false)
  }

  async function createRoom(event) {
    event?.preventDefault()
    const cleanTopic = topic.trim()
    if (cleanTopic.length < 2) return
    if (!(llmSettings.apiBase && llmSettings.model && llmSettings.apiKey)) {
      setSettingsOpen(true)
      return
    }
    setError('')
    setCreating(true)
    const nextRoom = { topic: cleanTopic, stage_number: 0 }
    setRoom(nextRoom)
    setEvents([])
    setStageResult(null)
    await runStageForRoom(nextRoom, '', [])
    setCreating(false)
  }

  async function runStageForRoom(targetRoom, guidance = '', initialEvents = events) {
    if (!targetRoom || running) return
    setRunning(true)
    setError('')
    setStageResult(null)
    const stageNumber = (targetRoom.stage_number || 0) + 1
    const stageHistory = guidance.trim() ? [...initialEvents, { speaker: '主持人补充', content: guidance.trim() }] : [...initialEvents]
    if (guidance.trim()) setEvents(stageHistory)
    const controller = new AbortController()
    abortControllerRef.current = controller
    try {
      const result = await runDebateStage({
        topic: targetRoom.topic,
        history: stageHistory,
        stageNumber,
        settings: llmSettings,
        signal: controller.signal,
        onTurnStarted: setThinkingRole,
        onTurn: (turn) => {
          setThinkingRole(null)
          setEvents((current) => [...current, turn])
        },
      })
      setThinkingRole(null)
      setStageResult(result)
      setRoom((current) => ({ ...current, stage_number: stageNumber }))
    } catch (requestError) {
      setThinkingRole(null)
      if (requestError.name !== 'AbortError') setError(requestError.message)
    } finally {
      abortControllerRef.current = null
      setRunning(false)
    }
  }

  function reset() {
    abortControllerRef.current?.abort()
    setRoom(null)
    setTopic('')
    setEvents([])
    setStageResult(null)
    setError('')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          <div className="model-status"><span className={llmSettings.apiKey ? 'online' : ''} />{statusText}</div>
          <button className="header-button" onClick={() => setSettingsOpen(true)}><Settings size={15} />模型配置</button>
        </div>
      </header>
      {!room ? (
        <>
          <EmptyState onUseTopic={setTopic} />
          <form className="topic-composer" onSubmit={createRoom}>
            <div className="composer-icon"><Plus size={20} /></div>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="输入议题、创业项目或产品 idea…" maxLength={300} autoFocus />
            <button type="submit" disabled={topic.trim().length < 2 || creating}>{creating ? <><LoaderCircle size={17} className="spin" />正在分析</> : <>开始评估<Send size={17} /></>}</button>
          </form>
        </>
      ) : (
        <DebateView room={room} events={events} thinkingRole={thinkingRole} running={running} stageResult={stageResult} onNextStage={(guidance) => runStageForRoom(room, guidance)} onReset={reset} />
      )}
      {error && <div className="error-toast"><CircleStop size={17} />{error}</div>}
      {settingsOpen && <LlmSettingsModal value={llmSettings} onSave={saveLlmSettings} onClose={() => setSettingsOpen(false)} />}
      <footer><span>知辩 AI</span><i />用证据和推理，帮助想法变得更可靠</footer>
    </div>
  )
}

export default App
