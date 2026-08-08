# @silk-road-monopoly/env

环境变量管理包，支持 Node.js 和浏览器双端使用。

## 使用方式

### Node.js
```ts
import { env } from '@silk-road-monopoly/env';
const port = env<number>('SERVER_PORT', 8080);
```

### 浏览器 (Vite)
```ts
import { env } from '@silk-road-monopoly/env';
const apiUrl = env('API_URL');
```

### Vite 插件
```ts
import { envPlugin } from '@silk-road-monopoly/env/vite-plugin';
// vite.config.ts
plugins: [envPlugin()]
```
