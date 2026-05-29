---
title: "MCP or CLI（上）：深度解析"
aliases:
  - "07 MCP or CLI（上）：深度解析"
  - "此山之石/MCP or CLI（上）：深度解析"
description: "SaaS 产品要让 Agent 调用能力时，MCP 和 CLI 不是简单二选一。本文从执行环境、Agent 训练先验、Skills、Token 成本和治理场景拆解接口选型。"
socialDescription: "MCP 和 CLI 不是二选一：真正要看的，是执行环境、Agent 先验、Skills 投入、Token 成本和治理场景。"
可发布: true
发布日期: 2026-05-29
tags:
  - Agent-First
  - MCP
  - CLI
  - AI-Agent
  - SaaS
---

2026 年的 SaaS 公司几乎绕不开一个问题：要不要让 Agent 能调用你的产品？答案必然是肯定的。那接下来要考虑的，就是选 MCP 还是 CLI？

在回答这个问题之前，让我们先拆解 —— CLI，这个可能让整场讨论失真的词。**你听到的关于"CLI"的几乎所有判断——更省 token、模型更熟、开发更快，说的都是 `docker`、`git` 这类成熟的传统 CLI；而你要实际要做的，是一个刚上线、LLM 训练数据中根本没有的新 CLI。两者顶着同一个名字，优劣却大相径庭。**

接下来我们会以此为依据，根据不同 CLI 的“原生处境”，给出不同的判断。这是把 MCP 和 CLI 真正讲清楚的前提，也是后面谈如何选型的基础。

先抛个结论：**MCP 和 CLI 不是"二选一"，也没有谁是"默认起点"。** 它们是针对不同场景的不同方案：

- 本地客户端、用户有技术背景、业务流程确定，CLI 往往更顺；
- 网页端、多用户协作、权限审计要求高、平台分发，MCP 往往更合适；
- 能力面足够广、客户形态足够复杂的企业，大概率会走向“MCP & CLI”的混合方案，区别只在先做哪个、什么时候补齐另一个。

# 一 搞清楚 MCP 和 CLI 到底是什么

### 两种 Agent 原生接口形态

**CLI** 是 Command Line Interface 的缩写——命令行工具，就是通过输入命令而不是操作 GUI 界面来操作系统的工具。`git`、`docker`、`aws` 都是 CLI，开发者已经用了几十年。在 Agent 时代的变化是：以前是人在终端里敲命令，现在是 Agent 替人敲。

**MCP** 是 Model Context Protocol 的缩写，Anthropic 在 2024 年底发布的一套开放协议[^1]。MCP 已经成为 Agent 调用外部工具的重要接口标准之一——让 Agent 和外部工具用统一方式对话，类似 USB 接口让所有外设和电脑用同一种插法连接。

这两个方案是当下传统产品拥抱 Agent 的必经之路，但有一个容易混淆的点：**此 CLI，非彼 CLI**。

![[07-fig1-cli-prior.png]]
_此 CLI，非彼 CLI_

1. **第一种：传统 CLI 被 Agent 使用。** `gh`、`git`、`aws` 这类工具原本是给开发者设计的，Agent 来了可以拿来就用。虽然它们的输出格式、错误处理、交互方式都按人类习惯设计——彩色高亮、进度条、`Are you sure? [y/n]` 这种确认提示，Agent 用起来其实不算友好，但因为这些工具在公开代码、文档和教程中高频出现，模型反而用起来很顺手。
2. **第二种：Agent 原生 CLI。** 飞书的 Lark CLI[^2]，明确写在 GitHub 项目简介里的就是 "built for humans and AI Agents"。钉钉的 dingtalk-workspace-cli[^3]也写 "built for humans and AI agents"。这些 CLI 从设计阶段就把 Agent 当主用户——默认输出 JSON 而不是给人看的表格、内置专门为 Agent 设计的"快捷指令包"、错误信息用结构化的代码而不是文字描述。这一点和传统 CLI 并不一致。

这两种 CLI 很容易被混为一谈，这也恰恰是误解的源头。很多关于 CLI 的判断——"CLI 模型更熟"、"CLI 更省 token"、"CLI 开发成本更快"——绝大多数说的是 `gh`、`git`、`aws` 这类**成熟的传统 CLI**：它们有几十年的文档积累、海量公开用例，模型早就在训练数据里见过它们无数次。

而你要做的，是一个**刚发布的 Agent 原生 CLI**：缺少训练数据、生态从零起步、文档也不够全。前者的每一条优势，都不是后者的自带属性。

> 所以这里特别说明一下：后续凡是不特别说明的"CLI"，默认指”Agent 原生 CLI“——也就是你大概率要做的那一种。

另外 MCP 也需要拆解一下。表面上 MCP 是一个"协议"，实际上 MCP 做的事情可以拆成三层：

![[07-fig3-mcp-layers.png]]
_MCP 不只是协议_

1. **协议层**：把"Agent 调用工具"这件事标准化。符合 MCP 标准的服务，可以用一套相对统一的工具定义和调用约定接入支持 MCP 的 Agent 客户端。
2. **运维标准**：MCP server 可以是本地进程，也可以是远程服务，按一套约定的方式连接、调用、处理错误、管理版本。
3. **生态分发**：围绕 MCP 形成的平台目录和客户端连接器，让 Agent 用户更容易发现并安装你的 MCP 服务。但这些分发入口来自第三方平台，不是协议本身自动保证的能力。

这 3 层的价值分布很不均匀。协议层是最容易实现的，但让 Agent 调用工具这件事并不是 MCP 发明的——Anthropic 自己的 Tool Use API、OpenAI 的 Function Calling 早就支持。**对 SaaS 产品方来说，MCP 真正的价值是三件事的叠加：协议层降低接入解释成本、运维标准减少为每个 Agent 客户端做定制的负担、平台分发让用户在部分平台入口更容易发现你**。

以飞书为例，看看同一个动作（查今天的日程）在 CLI 和 MCP 形态下分别是什么样的。

**CLI 形态——人在终端敲命令：**

```bash
lark-cli calendar +agenda
```

**CLI 形态——Agent 看到的 help 输出（节选）：**

```
lark-cli calendar - 日历命令组

用法:
  lark-cli calendar <subcommand> [options]

子命令:
  +agenda     查看今日日程
  +book       预订会议
  +cancel     取消会议
  ...

公共选项:
  --format    输出格式 (json|table|csv，默认 json)
  --user      指定用户身份
```

**MCP 形态——Agent 看到的 Tool 定义（示意，非飞书真实 Tool 名，仅用于说明）：**

```json
{
  "name": "calendar_get_agenda",
  "description": "查看用户今日的会议日程列表",
  "inputSchema": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "format": "date",
        "description": "查询日期，默认今天"
      }
    }
  }
}
```

两边都暴露的是"查今日日程"这个能力，但 Agent 接收到的信息长得不一样：CLI 给的是给人看的帮助文档，Agent 要从里面推断"这条命令做什么、要传什么参数"；MCP 给的是结构化的"接口说明书"，Agent 直接按字段填参数、读参数。

### CLI 的执行环境前提：一个常被忽略的硬约束

讨论 CLI 时有个前置问题很容易被忽略：**Agent 要运行 CLI 命令，需要一个能执行 shell 的环境**。这个前提决定了 CLI 在某些场景下是否可行。

![[07-fig4-cli-runtime.png]]
_CLI 要跑起来，先看执行环境_

Agent 运行 CLI 的形态有三种：

1. **用户在自己机器上跑本地 Agent。** Claude Code、Cursor、Codex 等本地客户端，Agent 跑在用户机器上，可以直接调用本地装的 CLI。这种模式下 CLI 没有额外服务成本——用户机器本身就是执行环境。
2. **云端 Agent + 沙箱。** Claude Code on the web、Codex cloud 这类云端 Agent 服务，没有用户本机可用，要跑 CLI 就必须配一个"沙箱"或云端代码环境[^5]。沙箱是一个隔离的临时虚拟机——临时启动、跑完即销毁，默认应与宿主机数据隔离，除非显式挂载或授权。沙箱由 Agent 平台提供，也可以接入 E2B、Daytona、Modal 这类第三方服务。
3. **浏览器扩展 Agent。** Claude in Chrome 这类在浏览器里操作的 Agent，按官方能力描述主要是在页面内读取、点击和导航；它没有本机 shell 执行能力，这种 Agent 用 CLI 几乎不可能。

而沙箱服务并不是免费的。截至 2026 年 5 月，按 E2B 公开报价粗略估算[^4]：

- E2B 按运行中的 sandbox 秒级计费，1 vCPU + 1 GiB 内存的最小自定义档约 **0.48 元 / 小时**
- 如果你有 1000 个日活用户，每人每天用 60 秒沙箱时间，月成本大约是 **230-240 元**。这个估算不含闲置、网络、存储、平台套餐差异，真实规模上去之后仍然是实打实的开销
- 体验上沙箱有冷启动延迟（几秒到十几秒），用户体感会有挫败感
- 另外就是安全成本：沙箱里跑用户自己的命令，需要做隔离、网络管控

这就意味着一个前提条件：**如果你的目标 Agent 客户端既没有本地 shell，也没有云端沙箱环境，CLI 就不能作为直接执行入口。** 这类网页端或嵌入式 Agent，通常更适合走 MCP、OpenAPI 或浏览器操作，而不是指望用户本地安装 CLI。

所以**判断顺序很简单**：先看目标 Agent 客户端能不能跑 shell：不能，就不要把 CLI 当主路径；能跑但要走沙箱，再算一遍上面的成本是否值得。

### Skills：高于协议的抽象层

在 CLI 和 MCP 之上，近期还有一个值得探讨的概念：**Skills**。

Anthropic 在 2025 年 10 月正式介绍 Agent Skills[^6]，可以理解成"AI 时代的快捷指令包"。一个 Skill 是一个文件夹，里面有一个 `SKILL.md` 文件描述这个 Skill 做什么、什么时候用、用什么底层工具。当 Agent 遇到匹配的任务时，自动加载这个 Skill 的指令到上下文里，按指令执行。

关键点在于：**Skills 不是 MCP 或 CLI 的同层竞争者**。它更像上层说明书包或专家方法论，可以指导 Agent 调用 MCP Tool，也可以指导 Agent 调用 CLI 命令，甚至两者混用。业务层设计 Skills 框架，实现由 MCP 或 CLI 来操作。不过这个逻辑是否成立，取决于具体 **Agent 运行时是否支持 Skills、文件系统、代码执行和工具权限。**

飞书 Lark CLI 内置了 **26 个 Agent Skills**，覆盖发消息、查日程、处理审批等高频组合操作。当用户的 Agent 装上飞书 CLI，并加载这些 Skills 后即可开箱即用，Agent 不用从子命令拼出"提醒老板 3 点开会"这种动作，可以直接调用对应的 Skill，识别出 CLI 命令并执行。钉钉 CLI 也内置了类似的 Skills 设计。

总之，Skills 是更高一层的抽象，并不和 MCP / CLI 竞争。是否设计 Skills 包、做几个、怎么命名，就是如何用好 MCP / CLI 的实操细节了。

## 二 技术层对比：协议本身的真实差异

接下来我们具体看看 MCP 和 CLI 的具体实现——研发团队要开发什么、持续维护什么。

### 1. 协议机制

其实两种方案背后通常调的是同一套 API（具体产品的 OpenAPI），区别在于"包装方式"。

- CLI 把 API 包装成命令行命令。Agent 通过 shell 执行命令，输入是命令行参数，输出是文本（Agent 原生 CLI 默认输出 JSON 这一类结构化文本）。
- MCP 把 API 包装成一组 Tool。每个 Tool 用一份"接口说明书"定义好输入参数，并约定返回内容的组织方式，Agent 不经过 shell，直接按说明书调用。

一个形象的区别：CLI 像是给 Agent 一本操作手册，让它自己按图索骥；MCP 像是给 Agent 一个填空表格，每个空位都标注了该填什么，会拿到什么。

所以对 SaaS 产品方来说，这不是协议优劣，而是你要维护一套命令入口，还是维护一组标准 Tool 契约。

### 2. 多步任务的信息衔接

Agent 在实际调用时，有两种常见的实现形态。

- CLI 通常是**每次用完就关掉，下次再重新打开**；
- MCP server 则支持以本地长驻进程或远程服务的方式存在，**在任务过程中可以一直待命**。

接下来可能会想到：既然 MCP 一直开着，那它应该能顺手把中间状态都记住，CLI 这种用完就关的就差一些吧？这个想法一半对、一半错。

可以把二者想象成办事窗口：

- CLI 每次调用都是"开门、办事、关门走人"，启动一个新进程，命令跑完进程就退出，内存清空。上一次调用的结果，带不到下一次。
- MCP 服务在很多实现里更像"门一直开着的商店"，Agent 多次调用之间服务端不一定下线。这意味着实现层可以把“上次查到的结果”、“谁登录了”、“数据库连接”这些信息记在内存里，下次调用直接复用。

这个差异在简单场景下感知不强——查个日程、发条消息，一次调用就结束。但在复杂流程里会变得明显。比如 Agent 要先查数据库结构、再写查询、最后生成报告：用 CLI，每一步都是冷启动，Agent 得自己带着前面的结果继续走；而用 MCP，服务端可以把中间状态缓存起来，Agent 负担更轻一些。

不过有个变化要提醒：预计在 2026 年 07 月发布的 MCP 新版规范中，会弱化把上下文保存在协议会话里的假设。换句话说，**MCP 长驻 ≠ 协议默认替你管状态**。状态、权限、失败恢复的责任，仍然要由你的服务端、数据库来承担。

### 3. 协议演进与版本稳定性

CLI 底层依赖的是 shell，一套用了 40 年的稳定标准。命令行的基本玩法几十年没怎么变，今天写的 CLI，未来很长时间都不用担心底层规则变化。

而 MCP 还在快速演进。2024 年底发布，到 2026 年中已经经历了多次规范更新；2026-07-28 规范又把无状态核心、Tasks、MCP Apps 等方向推到更前面[^7]。对产品方来说，这意味着做了 MCP 服务之后，要持续跟进规范变化和不同 Agent 客户端 的兼容性，这是 CLI 不太有的负担。

稳定有稳定的代价，演进有演进的优势：shell 稳定但能力扩展慢，MCP 灵活但要不断追着规范跑。

所以做 CLI 时要重视命令兼容性和版本管理；做 MCP 时要预留规范升级、客户端差异和客户端适配的维护成本。

### 4. 调试与可观测性

出了问题怎么排查，是个容易被忽略但很实在的差异。

- CLI 的调用过程更透明，命令是什么、返回了什么，终端里基本看得见。
- MCP 的调用经过协议层，需要专门的调试工具（比如 MCP Inspector）才能看清 Agent 到底传了什么、服务端返回了什么。对早期团队来说，这会有一定的排障成本。

CLI 更像本地入口的轻量封装，MCP 更像标准化的服务接口。对 Agent 而言，前者胜在组合性强、反馈透明可复现；后者胜在调用契约清晰，但要跟着协议和客户端生态持续演进。但两者并非对立关系，是同一套底层能力面向 Agent 的两种接入方式。

CLI 更像把你的产品变成一组可执行命令，MCP 更像把你的产品变成一组可发现、可授权、可组合的工具契约。

## 三 Agent 视角对比：“真实用户”的关注点

前面是协议技术实现的对比。但 AI 时代 CLI 和 MCP 的“真实用户”，是 Agent。Agent 关心的事情和人不一样，它不关注界面好不好看，关注"能不能搞清楚怎么调、调一次要烧多少预算、出错了怎么办"。

### 1. 能力发现与调用准确性

Agent 接入一个工具，第一步是搞清楚"它能干什么、怎么调"。 MCP 和 CLI 两种形态给出的策略不一样。

MCP 的工具定义是结构化、机器友好的。很多 Agent 客户端 在连接建立后的工具发现阶段，会把 MCP Server 提供的工具连同名称、用途和参数 schema 注册进模型上下文——Agent 动手之前就拿到一份“能力清单”，不用自己摸索。代价是工具一多，这份清单会挤占大量的上下文，所以才有了后来的按需发现、工具过滤等优化。

而 CLI 这边，要看有没有配套 Skills。如果直接用一个 CLI，Agent 得自行探索：先跑 `--help` 看有哪些命令，遇到子命令再往下展开，从帮助文档里推断参数怎么传。

但像 lark-cli 这种为 Agent 设计的 CLI 会附带 Skills 手册，把有哪些命令、参数怎么传预先写清楚，Agent 开箱即用，省去了盲目试探。也就是说，Skills 就是 CLI 版的"使用说明书"。

举个例子：Agent 要调用某个功能，MCP 模式下它直接知道"这个 Tool 需要一个日期参数，格式是 YYYY-MM-DD"；CLI 模式下它要从帮助文本里读出来"这条命令有个 `--date` 选项，应该就是这个格式"，而这个"应该"正是出错的空间。

不过 Agent 原生 CLI 在缩小这个差距：通过更扁平的命令结构、更规整的帮助文档，让探索更容易。但探索这个动作本身省不掉，而 MCP 把它提前到了一次性读取。总之，MCP 省去了面对陌生工具的探索成本；CLI 更依赖帮助文档、示例和错误提示质量。

这意味着新做 CLI 时，`--help`、示例、默认 JSON 输出和错误码不是文档附属品，而是 Agent 能否正确调用产品的核心设计。

### 2. 返回结构化与错误处理

Agent 拿到工具输出的结果后要提取信息、判断对错，这两件事在传统 CLI 和 MCP 之间曾有明显差距：

- 传统 CLI 输出是给人看的文本、错误信息也混在文本里，Agent 得自己"阅读理解"，还难分清是参数错了还是网络问题；
- MCP 更容易提供结构化的输入契约和错误对象，Agent 可以按 schema 填参数、按错误对象判断问题类型；但业务返回是否足够结构化，仍取决于 server 怎么设计。

不过设计较完整的 Agent 原生 CLI 已经能显著缩小这个差距——比如飞书 Lark CLI 默认输出 JSON、使用结构化错误码，Agent 用起来和 MCP 的差距就小很多。

所以真正要比较的不是“CLI 文本 vs MCP 结构化”，而是你的 CLI 和 MCP server 有没有把返回结构、错误类型和重试提示设计清楚。

### 3. 多步任务执行

当 Agent 需要把多个动作串成一个流程时，两者的能力值也不一样。

CLI 天然适合任务编排。shell 支持管道（把一个命令的输出直接喂给下一个）、循环、条件判断。只要命令稳定、任务可脚本化、失败恢复简单，Agent 就可以把整套流程写成一段脚本，一次性跑完，中间不用反复决策，这就会更快、更省预算。

MCP 协议本身没有原生的"串联"机制，每个 Tool 是独立的，Agent 调一个、看结果、再调下一个，每步都消耗一轮思考。

不过实际场景中，CLI 的这个优势可能会打折扣：大多数 Agent（包括 Claude Code、Cursor）默认还是逐步执行，只有在任务非常确定、步骤可预测时才会生成完整脚本。所以 **CLI 的多步优势不是"始终会赢"，而是"确定性高、可脚本化后才会赢"。** 任务一复杂、中间有不确定性，Agent 还是会退回逐步执行，这时 CLI 的优势就不明显了。

换句话说，即使你的 SaaS 任务本来就有判断、确认和协作状态，也不要只因为“shell 能编排”，就高估了 CLI 的实际收益。

### 4. LLM训练先验的差异

这是 Agent 视角下最关键、也最容易被忽略的一个差异。训练先验，正是不同的 CLI 拉开差距、容易被偷换概念的地方。

AI 模型在海量数据上训练，`git`、`gh`、`docker`、`aws` 这些**传统 CLI** 在 LLM 的训练数据里反复出现，模型对它们有很深的了解，Agent 用 `gh` 往往不需要太多探索。在 Scalekit 2026 年 2 月的第三方 GitHub read-only benchmark 中[^8]，Agent 用 `gh` CLI 完成任务的成功率达到 100%，消耗的预算也很低。

但这个优势，对于大多数新发布的 CLI 是无法享受的。Agent 对它一无所知，每次都要靠 `--help` 摸索、试错。这时候 CLI 不仅不省事，反而可能比 MCP 更容易出错、更费预算。

当然 MCP Tool 同样没有训练数据，但它有"能力清单"兜底，Agent 不熟悉也能照着说明书操作。

我们不能用 `git` 的成功率来推导出自己发布的 CLI 会有多好用。`git` 的表现很可能来自工具成熟度、文档质量和模型训练数据的共同作用，而你的新工具一开始是从0起步的。这个差距会随着使用量增长和模型迭代慢慢缩小，但要谨记不同 CLI 的起跑线是不一样的。

因此，业内那些"先做 CLI 更快更省"的建议，**一个隐含的前提是你的 CLI 能站在 `git` CLI 的肩膀上**。但这并不成立。对一个全新 CLI，上线初期反而可能比 MCP 更贵、更易错：MCP 至少有"接口说明书"给 Agent 兜底，新 CLI 只能靠 Agent 不断`--help` 试错。这不是说别做 CLI，而是说**别把"CLI 天然更省"当成真理**，那个"省"是成熟传统 CLI 的特权，不是 CLI 这个形态的光环。

### 5. Skills 能提供的帮助

Skills 能明显改善 Agent 的调用 MCP 和 CLI 的体验。本质上，它是一份预先写好、专门给 Agent 看的"使用说明书"，告诉 Agent 有哪些命令、参数怎么传、什么场景该怎么组合，以及哪些坑要避开。

没有 Skills 时，Agent 要完成“提醒老板 3 点开会”这种动作，得自己一步步拼：先查老板是谁、再查他的日程是否空闲、然后创建日程并加上提醒，多个分步操作串起来，每一步都可能在命令名、参数格式上出错。

有了 Skills，这套流程就可以被产品方提前写清楚，Agent 顺着 Skill 的指导去执行，既不用盲人摸象、也降低了选错命令、拼错参数的概率。一些复杂场景甚至可以有专门的类“workflow” Skill 把整条链路都打包好，比如 lark-cli 的 `lark-workflow-meeting-summary`（会议纪要）、`lark-workflow-standup-report`（日程待办摘要）。

不止如此，Skills 对 CLI 和 MCP 的调用效率都有很大帮助，只是方向不一样。

- **Skill + CLI，降低的是"探索成本"。** 裸 CLI 下，Agent 想知道有什么命令、参数怎么传，要不断跑 `--help`、读文本、靠试错纠正。Skills 把这些预先告诉 Agent，省去了盲目探索。这正是飞书 lark-cli、钉钉 dingtalk-workspace-cli 的策略。
- **Skill + MCP，降低的是"初始化负担"。** 在很多客户端的直接接入方式里，可用工具及 schema 会被注册进模型上下文，工具一多，上下文就被撑得很满。多一层 Skill 作为"调度提示"，告诉 Agent "做 X 类事情时优先用这几个工具"，可以把实际进入上下文的工具集收窄，从而把这块固定开销降下来。

所以，更准确的说法是：**不管执行层是 CLI 还是 MCP，只要为 Agent 提供一份及时、可靠的 Skill"说明书"，首次调用的 token 消耗、出错率就能压下去。** 飞书 Lark CLI 内置 26 个 Skills、钉钉 CLI 也有同样的设计，本质上都是在做这层抽象。

### 6. Token 消耗

关于使用工具过程中涉及到的 Token 消耗，CLI 和 MCP 孰多孰少，其实不一定，主要看两个变量。

![[07-fig5-token.png]]
_Token 消耗：看变量，不看名号_

1. MCP 暴露了多少 Tool。在 Scalekit 2026 年 2 月的第三方 GitHub read-only benchmark 中[^8]，某个 MCP 服务一口气暴露了 43 个 Tool，完成一个简单任务（“这个仓库用什么语言”）消耗了 44,026 个 token，而 CLI 只花了 1,365 个，差了 32 倍。原因很直接：大量 Tool schema 如果直接暴露给模型，但实际只用到一两个，剩下的就会变成无效的上下文开销。
2. Agent 模型对工具的熟悉度。Smithery 的第三方 756-run benchmark[^9]显示，在 Codex 这类模型上，CLI+search 的计费 token 反而比原生 MCP 更低（64,916 vs 94,823）；但同一组实验里 MCP 的任务成功率仍然更高（91.7% vs 83.3%）。换句话说，"省不省 token"不光看协议本身，也要看 Agent 模型对目标工具的熟悉程度。

这些 benchmark 更适合作为方向性证据，不适合当成所有产品的通用性能结论。因此，在没有优化的情况下，没有哪个就更省 token，关键在于控制 MCP 的 Tool 数量、提高 CLI 的命令可发现性，这比纠结选哪条路线更重要。而优化方案，也正是前面提到的和 Skill ”说明书“的组合。

最后，把以上 6 个维度汇总一下：

| 维度           | MCP                                                  | Agent 原生 CLI                           |
| -------------- | ---------------------------------------------------- | ---------------------------------------- |
| 能力发现与调用 | 很多客户端初始化即可拿到全量工具清单，参数清晰明了   | 靠 `--help` 逐步探索，参数靠推断         |
| 返回与报错     | 输入契约和错误对象更标准，业务返回取决于 server 设计 | 设计较好的 Agent 原生 CLI 可显著缩小差距 |
| 多步任务       | 逐步调用为主                                         | shell 脚本可一次跑完，但只在有脚本时触发 |
| 训练先验       | 无先验，靠工具清单兜底                               | 传统工具强；新工具先验弱                 |
| Skills         | 降低初始化成本                                       | 降低探索成本                             |
| Token 消耗     | 取决于暴露的 Tool 数量                               | 取决于 Agent 对工具的熟悉度              |

## 四 案例分析：飞书、Notion

前三章建立了一组判断变量——执行环境、训练先验、Tool 数量、Skills 投入、Token 消耗等。最后借两个案例实际看看：**飞书和 Notion 都同时做了 CLI 和 MCP，但两边的"量级"和"分工"很不一样**。这些差异背后，恰好可以用前面的维度来分析。

### 飞书：CLI 与 MCP 互补，按"身份和场景"分工

截至 2026 年 5 月，飞书的 Lark CLI[^2] 是一个**业务操作向**的 CLI：200+ 命令、26 个 Skills，覆盖消息、日历、文档、多维表格、邮件、任务等 18 个业务域。README 直写 "built for humans and AI Agents"，明确把 Agent 当主用户。

另外，飞书也提供官方 Lark OpenAPI MCP[^11]：默认暴露约 20 个常用的 tool，底层可调度约 1270+ 个接口。调用方必须根据实际需要，选择性切片加载，防止撑爆上下文。

两者都由飞书官方维护，定位是**互补、而非主次**。真正决定用哪个的，是下面这几条边界：

- **身份**：CLI 走 OAuth 登录，以**你个人的飞书身份**执行操作，能读个人日程、搜聊天记录、访问你有权限的文档；MCP 用 App ID + Secret，以**应用（bot）身份**操作。个人工作流里用户身份几乎是刚需，这类场景天然偏 CLI。
- **是否常驻**：CLI 无需常驻进程、按次调用、开箱即用，进程式、无会话状态、并发友好；MCP 需要起一个常驻服务进程。
- **格式保真**：CLI 读飞书文档能保留完整富文本结构（飞书文档 40+ 种块类型，含图片、流程图、代码块）；MCP 读文档目前只能拿到纯文本、丢掉格式。所以**"把完整文档当上下文喂给 Agent"这件事，反而是 CLI 更强，而不是 MCP**。
- **事件与状态**：以 bot 身份常驻后台、做状态管理或标准化集成时，MCP 更合适。MCP 的"实时"强调**常驻服务被动接收事件**，而不是任务中途主动查数据，后者用 CLI 那种轻量按次调用反而更顺手。

对应到前面的内容：

- 飞书业务面极广，1270+ 个接口如果一次性走 MCP，容易带来很高的上下文压力，所以只默认暴露了常用 tool，靠按需切片减压；
- CLI 要能跑，前提是 Agent 所在环境能执行 shell，飞书把个人身份操作、富文本读取这些常见动作压在 CLI 上，本身就依赖了用户多在本地客户端支持 shell 的场景；
- 新发布的 Agent 原生 CLI 对 LLM 来说是知识空白，靠内置 26 个 Skills 弥补探索成本。

### Notion：MCP 面向日常，CLI 面向开发者

截至 2026 年 5 月，Notion 对外提供了托管的 Notion MCP[^10]，用户授权登录后即可在 ChatGPT、Claude 等客户端里接入，暴露 22 个工具，集中在搜索、检索、页面与数据库的读写——刚好对应 Notion 用户最高频的操作。

而 Notion CLI **`ntn`**[^12] 的思路和飞书 Lark CLI 不同：飞书 CLI 面向的是"以个人身份操作全量业务"，ntn 则面向开发者，支持发起 Notion API 调用、操作数据源（页面 / 数据库）、上传图片或 PDF 文件，几乎是把 Notion API 原样搬进终端，另外也配套了 Skill “notion-cli”[^13]，教 Agent 怎么使用 Notion CLI，包括调用时机、鉴权方式与常用命令组等。

对应到前面的内容：

- 托管 Notion MCP 工具数相对克制（搜索、检索、页面与数据源读写为主），上下文压力远小于飞书；
- Notion MCP 面向 ChatGPT、Claude 等常见 Agent 客户端，很多这类入口并不直接提供用户本机 shell，MCP 因此是更普适的接入方式；
- Notion CLI ntn 的出现不是"补 MCP 不够覆盖的业务命令"，而是给专业开发者和 coding agent 一条更原始、更灵活的全量 API 直连通道。两条路径覆盖的是不同的人群和场景。

### 给我们的启发

如果你的 SaaS 产品也在做这两条线的选型，可以依照飞书、Notion 的产品策略，问自己几个问题：

1. **业务操作面有多广？** 操作类型越多、OpenAPI 越多，越需要 CLI 这种"按需暴露"的接口来为 MCP 上下文减压，把长尾操作放进 CLI，MCP 只留高频操作、保持精简。
2. **目标 Agent 客户端分布在哪里？** 这是个硬约束：用户的 Agent 多在云端/网页、跑不了 shell，MCP 更合适；多在本地（Claude Code、Cursor 这类），CLI 才能落地。
3. **你愿意为新 CLI 补多少"说明书"？** 你要做的是全新 CLI，零经验意味着 Agent 首次调用要靠探索，出错率和 token 都更高。内置 Skills、规整的 `--help` 和结构化错误码的质量，直接决定 CLI 好不好用，这部分投入省不掉，也是飞书、钉钉都内置 Skills 的原因。
4. **CLI 和 MCP 是否要明确分工？** 别把两者分"先后"或"主次"。从公开能力形态看，飞书是按"身份和场景"分工，Notion 更像按"用户画像"分工。

## 结语：了解了 MCP 和 CLI 之后

以上从协议概念、Agent 调用做了拆解，再以飞书和 Notion 案例对比，可以把 MCP 和 CLI 这两个概念总结一下：

- 技术上，CLI 协议简洁稳定，MCP 灵活但要持续跟随规范和客户端演进
- Agent 视角下，MCP 调用更规范，但 Agent 原生 CLI 在快速追平，注意传统工具的"训练先验"是某些 CLI 的独家优势
- 成本上，CLI 前期轻，但云端场景的沙箱成本和 MCP 的服务运维都是持续开销
- 选 CLI 还是 MCP，最终落到你的业务面广窄、目标 Agent 客户端的执行环境、以及两者之间是否要做分工，不是非此即彼

最关键的一点：**没有哪个维度是 MCP 或 CLI 绝对胜出的，每个结论都带着前提条件**—— Skill 完善程度、Tool 数量多少、Agent 对工具是否熟悉、用户调用环境、产品在业务中处于什么位置。

深挖这两个概念的本质差异，是为了让我们不被名词绕晕。现在，你不该得到一个固定答案，而一组判断变量。下一篇我们这些变量放进具体 SaaS 场景：开发者工具、协作文档、CRM / 审批 / HR 这类业务 SaaS，具体看看怎么做。

[^1]: Anthropic: _Introducing the Model Context Protocol_. https://www.anthropic.com/news/model-context-protocol

[^2]: 飞书 Lark CLI GitHub 仓库. https://github.com/larksuite/cli

[^3]: 钉钉 dingtalk-workspace-cli GitHub 仓库. https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli

[^4]: E2B 官方定价页. https://e2b.dev/pricing

[^5]: Anthropic Claude Code on the web 文档. https://code.claude.com/docs/en/web-quickstart / OpenAI Codex 文档. https://platform.openai.com/docs/codex

[^6]: Anthropic Agent Skills 官方仓库. https://github.com/anthropics/skills / Agent Skills 官方文档. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

[^7]: MCP Blog: _The 2026-07-28 MCP Specification Release Candidate_. https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/ / MCP Blog: _Prompts for automation_. https://blog.modelcontextprotocol.io/posts/2025-07-29-prompts-for-automation/

[^8]: Scalekit: _MCP vs CLI: Benchmarking AI Agent Cost & Reliability_. https://www.scalekit.com/blog/mcp-vs-cli-use

[^9]: Smithery: _MCP vs CLI Is the Wrong Fight_. https://smithery.ai/blog/mcp-vs-cli-is-the-wrong-fight

[^10]: Notion MCP 概览（托管远程版）. https://developers.notion.com/guides/mcp/overview / 托管 MCP 接入端点. https://mcp.notion.com / 自托管开源仓库. https://github.com/makenotion/notion-mcp-server / Notion Help Center: _MCP connections for Custom Agents_. https://www.notion.com/help/mcp-connections-for-custom-agents

[^11]: 飞书 Lark OpenAPI MCP 仓库. https://github.com/larksuite/lark-openapi-mcp / OpenAPI MCP overview. https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction

[^12]: Notion Developer Platform 发布说明（2026-05-13）. https://www.notion.com/releases/2026-05-13 / Notion CLI 官方文档. https://developers.notion.com/cli/get-started/overview

[^13]: Notion 官方 Skills 仓库. https://github.com/makenotion/skills
