import "reflect-metadata";
import fs from "fs";
import path from "path";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import chalk from "chalk";
import { PeerServer } from "peer";
import { env } from "@silk-road-monopoly/env";

// ==================== 日志工具 ====================
function serverLog(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = level === 'error' ? chalk.red('[ERROR]') : 
                 level === 'warn' ? chalk.yellow('[WARN]') : chalk.cyan('[INFO]');
  console.log(`${prefix} ${new Date().toISOString()} ${message}`);
}

// ==================== 错误处理 ====================
const handleError: ErrorRequestHandler = (err, req, res, next) => {
  serverLog(`${err.message || err}`, 'error');
  res.status(500).json({ status: 500, msg: '服务器内部错误' });
};

// ==================== 身份验证中间件 (简版) ====================
const roleValidation: RequestHandler = (req, res, next) => {
  // 公开路由跳过验证
  const publicPaths = ['/user/login', '/user/register', '/health', '/static'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  // TODO: 实现 JWT 验证逻辑
  next();
};

// ==================== 路由占位 ====================
import { Router } from "express";

const routerUser = Router();
routerUser.post("/login", (req, res) => {
  res.json({ status: 200, msg: "登录成功", data: { token: "placeholder" } });
});
routerUser.post("/register", (req, res) => {
  res.json({ status: 200, msg: "注册成功" });
});

const roomRouter = Router();
roomRouter.get("/list", (req, res) => {
  res.json({ status: 200, msg: "ok", data: [] });
});

const gameMapRouter = Router();
gameMapRouter.get("/list", (req, res) => {
  res.json({ status: 200, msg: "ok", data: [] });
});

const coturnRouter = Router();
coturnRouter.get("/config", (req, res) => {
  res.json({ status: 200, msg: "ok", data: {} });
});

const statisticsRouter = Router();
statisticsRouter.get("/overview", (req, res) => {
  res.json({ status: 200, msg: "ok", data: {} });
});

// ==================== 启动服务 ====================
async function bootstrap() {
  try {
    serverLog('正在启动 Silk Road Monopoly 服务端...');
    
    const app = express();
    
    app.set("trust proxy", true);
    app.use(cors());
    
    // 请求超时
    app.use((req, res, next) => {
      req.setTimeout(120_000, () => {
        if (!res.headersSent) {
          res.status(504).json({ status: 504, msg: "请求超时" });
        }
      });
      next();
    });
    
    app.use("/static", express.static("public"));
    app.use(roleValidation);
    app.use(bodyParser.json());
    
    // 频率限制
    app.use("/user/register", rateLimit({
      windowMs: 60 * 60 * 1000, max: 5,
      message: { status: 429, msg: "注册请求过于频繁，请稍后再试" },
    }));
    app.use("/user/login", rateLimit({
      windowMs: 60 * 1000, max: 10,
      message: { status: 429, msg: "登录请求过于频繁，请稍后再试" },
    }));
    
    // 注册路由
    app.use("/user", routerUser);
    app.use("/room-router", roomRouter);
    app.use("/game-map", gameMapRouter);
    app.use("/coturn", coturnRouter);
    app.use("/statistics", statisticsRouter);
    
    app.get("/health", (req, res) => {
      res.status(200).send("OK");
    });
    
    app.use(handleError);
    
    // API 服务
    const serverPort = env<number>("SERVER_PORT", 8081);
    app.listen(serverPort, () => {
      serverLog(chalk.bold.bgGreen(` 海上丝绸之路 API服务启动成功 ${serverPort}端口 `));
    });
    
    // ICE 服务 (WebRTC)
    const iceServerPort = env<number>("ICE_SERVER_PORT", 8082);
    PeerServer({ port: iceServerPort }, () => {
      serverLog(chalk.bold.bgBlue(` ICE信令服务启动成功 ${iceServerPort}端口 `));
    });
    
    // Admin 管理面板
    const adminPort = env<number>("SILKROAD_ADMIN_PORT", 8083);
    const adminApp = express();
    adminApp.get("/env.js", (req, res) => {
      res.type("js").send(`window.__RUNTIME_ENV__ = ${JSON.stringify({
        API_BASE_URL: `http://localhost:${serverPort}`,
      })};`);
    });
    adminApp.listen(adminPort, () => {
      serverLog(chalk.bold.bgMagenta(` 管理面板启动成功 ${adminPort}端口 `));
    });
    
    serverLog(chalk.green('🚢 海上丝绸之路大富翁服务端已就绪！'));
  } catch (e: any) {
    serverLog(`启动失败: ${e?.message || e}`, 'error');
    process.exit(1);
  }
}

bootstrap();
