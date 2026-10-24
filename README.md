# AI 物流实验室 · 静态体验版

面向零 AI 基础的物流同事的交互式学习游戏，无需安装前端依赖。

## 立即使用

打开同目录的 `index.html` 即可体验。推荐通过本地 HTTP 预览获得一致的存储与复制体验：

```sh
cd "/Users/harumi/Documents/Codex/2026-10-23/new-chat/outputs/ai-logistics-game"
python3 -m http.server 4187 --bind 127.0.0.1
```

浏览器打开 `http://127.0.0.1:4187`。本机预览只监听回环地址，后续可将隧道指向该地址。

## 已实现

- 552 道中文单选题：Easy / Normal / Hard 各 184 道；每个难度与主题组合有 61–62 道，覆盖 AI 与提示词、物流 To B、物流 To C。新增内容涉及提示词设计、知识库版本、评估集、误报漏报、结构与业务校验、权限与审计、订单粒度、库存、预约、线路约束、事件时间、ETA、末端服务、逆向物流、隐私和风险升级。
- 每局 20 题。综合练习从 AI、To B、To C 三类交替抽取（每类 6–7 题）；专项练习从所选类别抽满 20 题。随机题目顺序、随机选项顺序。
- 每题即时解析、关键知识总结、整局答案回顾。
- Easy / Normal / Hard 基础分为 100 / 150 / 200。连续答对的额外奖励依次为 0、10、20、30、30、30；答错重置连击，不扣已得分。
- 不限时、不按速度加分。20 题全对满分分别为 2540、3540、4540。
- 结算页以飞书姓名保存排行；按飞书身份、难度与练习方向分组，每人每组只显示最佳成绩。同分时用时短者优先，其后按获得成绩时间排序。
- 错题自动收集、展开解析、错题重练、手动标记已掌握。错题重练不进入正式成绩统计和排行榜。
- 学习进度、昵称和错题使用浏览器 localStorage 保存；排行榜成绩写入 Cloudflare D1，在飞书登录员工和不同浏览器之间共享。
- 知识补给站和可复制的物流提示词模板。
- 响应式桌面/窄屏页面、键盘 1–4 选项、Enter 确认、减少动态效果偏好。
- 飞书扫码登录门禁：未登录只显示扫码页；飞书回调在 Pages Functions 服务端换取身份并签发 HttpOnly 会话 Cookie；游戏脚本在会话验证后才加载。
- 登录后展示飞书头像并记录成功登录时间；“用户访问记录”仅管理员可见，服务端 API 会再次校验管理员飞书身份。
- Pages Functions 使用飞书会话验证成绩读写；排行榜按飞书 open_id、难度和练习方向保存每位员工的最佳成绩。

## 测试路径

1. 选择难度及方向，开始挑战；未选答案时不能提交。
2. 故意答错一题，检查零分反馈和错题记录；继续答对，检查连击分数。
3. 完成 20 题，检查题数、分数、正确率、用时和完整解析。
4. 用飞书身份保存成绩，在相同难度和方向的企业共享排行榜查看，刷新检查保留情况。
5. 进入错题本，完成重练，确认没有出现保存正式排行的入口。
6. 点击头像查看飞书身份并退出登录。

## 当前边界与下一步

本版是预设题库驱动的静态学习游戏，不调用大模型，不读取真实订单，不代表生产业务规则。

学习进度和错题仍保存在个人浏览器。原浏览器的个人榜单会在新版本首次打开时按当前飞书身份迁移到企业排行榜。成绩来自客户端游戏并做范围校验，适合内部学习激励，不作为正式绩效或竞赛凭证。

## 飞书扫码登录配置

登录后端使用 Cloudflare Pages Functions。通过 `python3 -m http.server` 打开静态文件时，Functions 不会运行，因此登录会停留在提示页；在 Cloudflare Pages 预览或生产环境中测试。

1. 在飞书开放平台创建企业自建应用，启用网页能力，网页地址填 `https://babycare2b.site`，添加回调 URL `https://babycare2b.site/api/auth/callback`，并发布应用。使用其他域名时，两处 URL 都换成实际 HTTPS 域名。
2. 在 Pages 项目 Settings → Variables and Secrets 中设置：`FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_REDIRECT_URI`（完整回调 URL）、`SESSION_SECRET`（至少 32 个字符的随机值）和 `ADMIN_FEISHU_OPEN_ID`（管理员本人飞书登录后端返回的 open_id）。管理员 open_id 只配置在服务端，不提交到 Git；App Secret 和 Session Secret 使用 Secret 类型。
3. 在 Pages 项目 Settings → Bindings 中新增 D1 database 绑定：变量名 `LEADERBOARD_DB`，数据库 `ai-logistics-qa-leaderboard`，应用到 Production（需要验证预览时也绑定 Preview）。首次升级执行 `migrations/0002_create_visit_logs.sql`；20 题版本执行 `migrations/0003_expand_leaderboard_to_20_questions.sql`，该迁移保留历史 6 题成绩。排行榜初始结构见 `migrations/0001_create_leaderboard.sql`。
4. 确认 `functions/` 目录随项目根目录一起部署。提交后等待 Pages Functions 部署完成，再用两个飞书账号分别登录并验证双方看到同一排行榜。

`lark-cli auth login` 是 CLI 工具的 Device Flow 授权，授权的是命令行自身，不能代替网站访客的网页扫码登录；本项目使用飞书网页 QR SDK、OAuth 回调和服务端会话。登录只用于获取用户基本身份，不访问物流、通讯录等业务数据；如果飞书后台提示需要用户基本信息权限，请按最小权限配置。

通过 `python3 -m http.server` 打开的静态本地页面不运行 Pages Functions，因此不能使用飞书登录或企业共享排行榜；共享功能需通过 Cloudflare Pages 地址访问。

文件职责：`index.html` 页面外壳；`styles.css` 样式；`auth.js` 飞书会话验证及登录后脚本加载；`app.js` 交互与本地存储；`questions.js` 基础题库；`questions-expanded.js` 按难度和主题扩展的深度题库；`core.js` 抽题、选项打乱、积分和排序逻辑。

基础阅读：[IBM 提示词技巧](https://www.ibm.com/think/topics/prompt-engineering-techniques)、[GS1 EPCIS 事件信息](https://www.gs1.org/standards/epcis)。题库中的数字和规则均为教学约定，不代表任何公司或承运商实际规则。
