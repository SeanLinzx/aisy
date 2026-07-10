# Volcengine Ark 接入说明

本平台默认通过 **火山方舟 Volcengine Ark** 提供真实的 AI 能力（文本 / 多模态 / 视频）。
当本地缺少 `ARK_API_KEY` 时，系统会自动回退到 `MockProvider`，业务链路不受影响。

实现位于：

- `apps/api/src/modules/ai/ai.types.ts` —— 通用 Provider 接口
- `apps/api/src/modules/ai/providers/volcengine-ark.provider.ts` —— Ark 适配器
- `apps/api/src/modules/ai/provider-registry.ts` —— 运行时注册表
- `apps/api/src/modules/ai-generate/*` —— 业务接口

---

## 1. 环境变量

```bash
# 必填（无 key 自动 fallback 到 mock）
ARK_API_KEY=ark-122144da-3d4a-41d7-9b8b-8bffb454b6f8-49fe4

# 可选（带默认值）
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_RESPONSES_PATH=/responses
ARK_VIDEO_TASKS_PATH=/contents/generations/tasks

ARK_TEXT_MODEL=                     # 留空时复用多模态模型
ARK_IMAGE_MODEL=                    # 暂未实现，留空使用 Mock 图
ARK_VIDEO_MODEL=doubao-seedance-2-0-mini-260615
ARK_MULTIMODAL_MODEL=doubao-seed-2-0-pro-260215

DEFAULT_AI_PROVIDER=volcengine-ark
```

> ⚠️ 真实 key 不要写入 `.env.example`，只放在本地 `.env.local` 中，`.gitignore` 已默认忽略。
> 启动脚本 `start-dev.sh` 会自动生成包含本地 key 的 `.env.local`，方便你立刻试真实链路。

---

## 2. 多模态 / 文本 —— `/responses`

样例 curl（来自官方文档）：

```bash
curl https://ark.cn-beijing.volces.com/api/v3/responses \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seed-2-0-pro-260215",
    "input": [
      {
        "role": "user",
        "content": [
          { "type": "input_image", "image_url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png" },
          { "type": "input_text",  "text": "你看见了什么？" }
        ]
      }
    ]
  }'
```

我们在 Provider 中把它封装为：

| 平台方法                | 系统 Prompt                       | 业务接口                               |
| ----------------------- | --------------------------------- | -------------------------------------- |
| `generateText`          | 儿童友好创作助理                  | `POST /api/ai-generate/text`           |
| `generateWebPage`       | 儿童友好前端，输出可独立运行 HTML | `POST /api/ai-generate/web`            |
| `generatePoster`        | A4 海报 HTML                      | `POST /api/ai-generate/poster`         |
| `generatePpt`           | 输出 JSON 数组（标题 + body）     | `POST /api/ai-generate/ppt`            |
| `generateMixedContent`  | 图文理解                           | `POST /api/ai-generate/mixed`          |
| `generateCode`          | 简单示例代码                      | `POST /api/ai-generate/code`           |

输入归一化后传给 `/responses` 的 `input[].content[]`：

- 文本 → `{ type: 'input_text', text }`
- 图片引用 → `{ type: 'input_image', image_url }`

返回结果通过 `extractText()` 兜底解析（兼容 `output_text` / `output[].content[].text` / `choices[0].message`），降低不同模型版本对系统的影响。

---

## 3. 图像生成 —— `/images/generations`

兼容 OpenAI Images 风格：

```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedream-3-0-t2i-250415",
    "prompt": "一只在彩虹上跳舞的小猫，水彩风格",
    "size": "1024x1024",
    "n": 1,
    "response_format": "url"
  }'
```

支持参数：

| 参数 | 说明 |
| --- | --- |
| `model` | 默认读 `ARK_IMAGE_MODEL`，可在管理员后台切换 |
| `prompt` | 文本描述（必填） |
| `size` | `1024x1024` / `1024x576` / `576x1024` / `1280x720` 等 |
| `n` | 一次生成多少张（默认 1） |
| `image` | 字符串数组：传入参考图 URL（即图生图） |
| `seed`, `guidance_scale`, `watermark` | 可选，按模型支持透传 |

我们在前端 `/student/image` 暴露了"尺寸 / 张数 / 参考图 URL"三个开关；服务端透传至 Provider，并在响应中接受 `data[].url` 或 `data[].b64_json` 两种返回。失败时自动 fallback 到 Mock 保证不阻塞演示。

实现位置：
- `volcengine-ark.provider.ts → generateImage()`
- `ai-generate.service.ts → generateImage()`
- 路径变量：`ARK_IMAGES_PATH`（默认 `/images/generations`）

---

## 4. 视频生成 —— `/contents/generations/tasks`

样例 curl（来自官方文档）：

```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ark-..." \
  -d '{
    "model": "doubao-seedance-2-0-mini-260615",
    "content": [
      { "type": "text", "text": "全程使用视频1的第一视角构图..." },
      { "type": "image_url", "image_url": { "url": "https://.../r2v_tea_pic1.jpg" }, "role": "reference_image" },
      { "type": "image_url", "image_url": { "url": "https://.../r2v_tea_pic2.jpg" }, "role": "reference_image" },
      { "type": "video_url", "video_url": { "url": "https://.../r2v_tea_video1.mp4" }, "role": "reference_video" },
      { "type": "audio_url", "audio_url": { "url": "https://.../r2v_tea_audio1.mp3" }, "role": "reference_audio" }
    ],
    "generate_audio": true,
    "ratio": "16:9",
    "duration": 11,
    "watermark": false
  }'
```

我们将该结构通过 `submitVideoTask()` 完整复现：

- **本地参考图/音视频**：与图生图相同，服务端会先把 `localhost` 上传文件读成 **base64 data URI** 再提交，避免方舟报 `resource download failed`。
- **首尾帧**：前端传 `first_frame` / `last_frame` 角色时，后端会自动映射为 `reference_image`，并包装成「图片1 首帧 → 图片2 尾帧」的提示词。

1. 学生在 `/student/video` 页面提交：
   - 文本提示词
   - 0~N 个引用素材（image / video / audio + role）
   - 时长 / 比例 / 是否生成音频
2. 后端写入 `AiGenerationJob`（`jobType=video`、`status=queued`），调用 Ark 拿到 `task_id`，状态转为 `running`。
3. **BullMQ Worker** (`video-task.processor.ts`) 每 4 秒一次轮询 `pollVideoTask(taskId)`：
   - 状态映射：`queued / pending / waiting / created → queued`，`succeeded / done / completed → succeeded`，`failed / canceled → failed`，其它 → `running`
   - 成功时：写回 `videoUrl`，并自动在 `Asset` 里创建一条 `type=video` 的素材
4. 前端 `/student/video` 页面每 4 秒轮询 `/ai-generate/jobs?type=video`，自动刷新「排队中 / 生成中 / 已完成 / 失败」。

> 🛠 **扩展点**：官方对「轮询任务详情」的具体路径形态可能调整。当前实现按最常见的
> `GET {videoTasksPath}/{id}` 兜底，未识别状态当成 `running` 不会卡住链路。
> 若你的环境采用其它路径，请在 `volcengine-ark.provider.ts` 的 `pollVideoTask` 函数处直接调整即可——
> 业务侧无需任何修改。

---

## 5. 切换 / 关闭供应商

- `管理员 → AI 供应商` 页面可一键启停某个 Provider；
- 关闭后所有受影响的调用自动回退至下一个可用 Provider，最终兜底是 Mock；
- 模型层面也支持单独启停（`AiModel.enabled`）；
- 学生侧只能看到「启用中」的模型。

---

## 6. 本地最小验证

```bash
# 1) 一键启动（自动注入 dev key）
./start-dev.sh

# 2) 浏览器登录 alice / 123456
# 3) 进入「图文理解 / 多模态」页面，上传一张图，提示词「你看见了什么？」
#    -> 后端会真实调用 /responses
# 4) 进入「生视频」页面，输入提示词，提交后查看任务状态从 queued -> running -> succeeded
```

如果想强制使用 Mock，删除 `.env.local` 里的 `ARK_API_KEY` 这一行（或留空），重启即可。
