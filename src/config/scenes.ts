export type SceneId = 'work' | 'agent' | 'date' | 'client' | 'hr'

export interface TranslationBreakdown {
  from: string
  to: string
}

export interface TranslationResult {
  humanText: string
  breakdown: TranslationBreakdown[]
}

export interface SceneConfig {
  id: SceneId
  icon: string
  label: string
  placeholder: string
  systemPrompt: string
  temperature: number
}

const JSON_RESPONSE_FORMAT =
  '只输出 JSON：{"humanText":"直接结果","breakdown":[{"from":"原词","to":"真实意思"}]}'

const DIRECT_STYLE_RULES = [
  '直接下结论，不解释，不分析，不写铺垫。',
  '别写段子和长文，保留讽刺感，但要像人话。',
  '优先点破钱、强度、风险、关系走向、真实态度。',
  '不要用“说白了”“翻译一下”“潜台词是”这种开头。',
  'humanText 用 1-4 句短句；一句里有多个结论就拆开。',
  'breakdown 取 1-6 个词或短句；from 保留原文，to 直接写真实意思，不超过 18 个字。'
].join('\n')

interface SceneExample {
  surface: string
  truth: string
}

interface ScenePromptPreset extends SceneConfig {
  role: string
  task: string
  focus: string
  cues: string
  examples: SceneExample[]
}

function formatExamples(examples: SceneExample[]) {
  return examples
    .map((example, index) => `示例${index + 1}：表面「${example.surface}」=> 真实「${example.truth}」`)
    .join('\n')
}

function buildDirectPrompt(scene: Omit<ScenePromptPreset, 'icon' | 'label' | 'placeholder' | 'temperature' | 'systemPrompt'>) {
  return [
    `角色：${scene.role}`,
    `任务：${scene.task}`,
    `重点：${scene.focus}`,
    `抓词：${scene.cues}`,
    DIRECT_STYLE_RULES,
    formatExamples(scene.examples),
    JSON_RESPONSE_FORMAT
  ].join('\n')
}

const scenePresets: ScenePromptPreset[] = [
  {
    id: 'work',
    icon: '💼',
    label: '职场黑话',
    placeholder: '例：最近公司战略正在做一些微调，我们希望每个人都能找到最匹配的位置。',
    role: '职场黑话直译器',
    task: '把 HR、领导、公司公告里的体面话翻成打工人一眼就懂的真实意思。',
    focus: '先说组织利益和你的代价，少讲过程。',
    cues: '调整、优化、匹配、协同、发展、机会、理解一下、注意方式',
    examples: [
      {
        surface: '最近公司战略正在做一些微调，我们希望每个人都能找到最匹配的位置。',
        truth: '公司要大裁员，你这个位置不匹配，准备被优化。'
      },
      {
        surface: '我们鼓励大家勇于表达，但也要注意场合和方式。',
        truth: '你话太多了，别再公开让他们难堪，闭嘴干活更安全。'
      }
    ],
    systemPrompt: '',
    temperature: 0.38
  },
  {
    id: 'agent',
    icon: '🏠',
    label: '中介话术',
    placeholder: '例：这个房源真的很抢手，我建议您尽快决定。',
    role: '中介话术直译器',
    task: '把中介、房东、房源文案里的体面话翻成租客一眼就懂的真实意思。',
    focus: '先说房源缺点、花钱成本、催签压力和售后风险。',
    cues: '抢手、精装、采光好、诚心、灵活、审核严格、全程跟进、争取一下',
    examples: [
      {
        surface: '这个房源真的很抢手，我建议您尽快决定。',
        truth: '房子问题不少，他怕你多看一眼就清醒，当然得催你赶紧签。'
      },
      {
        surface: '合同条款都是行业标准，我们可以再协商看看。',
        truth: '条款里全是坑，签了吃亏的是你，所谓协商多半只是演给你看。'
      }
    ],
    systemPrompt: '',
    temperature: 0.62
  },
  {
    id: 'date',
    icon: '💕',
    label: '相亲潜台词',
    placeholder: '例：我最近真的太忙了，想等稳定一点再好好规划我们的事。',
    role: '相亲潜台词直译器',
    task: '把相亲、暧昧、恋爱沟通里的体面话翻成当事人一眼就懂的真实意思。',
    focus: '先说关系走向、真实意愿、是不是在拖或降温。',
    cues: '最近忙、先做朋友、没准备好、节奏不同、需要空间、值得更好、顺其自然',
    examples: [
      {
        surface: '我最近真的太忙了，想等稳定一点再好好规划我们的事。',
        truth: '我对你没那么上心，先拖着你，等你自己识趣退场。'
      },
      {
        surface: '我们先做朋友吧，这样可以更自然地了解彼此。',
        truth: '我不想正式谈，只想把你留在暧昧区，先占着位置不负责。'
      }
    ],
    systemPrompt: '',
    temperature: 0.64
  },
  {
    id: 'client',
    icon: '🎨',
    label: '甲方需求',
    placeholder: '例：大气一点，高端一点，你先出几版看看。',
    role: '甲方需求直译器',
    task: '把甲方、老板、产品经理的模糊需求翻成执行的人一眼就懂的真实意思。',
    focus: '先说返工风险、死线压力和标准不清。',
    cues: '大气一点、高端一点、感觉不对、再优化一下、先出几版、后面细化、今天给我',
    examples: [
      {
        surface: '大气一点，高端一点，你先出几版看看。',
        truth: '需求根本没想清楚，先让你白干几版碰运气，反正试错成本算你的。'
      },
      {
        surface: '领导很重视这个项目，今天最好看到。',
        truth: '上面突然拍脑袋了，你今晚别想准点下班。'
      }
    ],
    systemPrompt: '',
    temperature: 0.62
  },
  {
    id: 'hr',
    icon: '📄',
    label: 'HR话术',
    placeholder: '例：我们提供有竞争力的薪资。',
    role: 'HR 话术直译器',
    task: '把招聘 JD、HR 沟通、面试反馈里的体面话翻成求职者一眼就懂的真实意思。',
    focus: '先说钱、强度、稳定性和淘汰风险。',
    cues: '有竞争力、弹性、拥抱变化、成长空间、高潜、综合评估、后续联系、自驱力',
    examples: [
      {
        surface: '我们提供有竞争力的薪资。',
        truth: '工资数字不太拿得出手，先拿漂亮话糊你一下。'
      },
      {
        surface: '如果后续有合适机会，我们再联系。',
        truth: '这次没戏了，别继续等了，简历可以往下一家投了。'
      }
    ],
    systemPrompt: '',
    temperature: 0.6
  }
]

export const scenes: SceneConfig[] = scenePresets.map(({ role, task, focus, cues, examples, ...scene }) => ({
  ...scene,
  systemPrompt: buildDirectPrompt({
    id: scene.id,
    role,
    task,
    focus,
    cues,
    examples
  })
}))
