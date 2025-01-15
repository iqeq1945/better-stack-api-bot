import {
  Client,
  IntentsBitField,
  EmbedBuilder,
  TextChannel,
  GatewayIntentBits,
} from "discord.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// 타입 정의
interface Monitor {
  id: string;
  attributes: {
    pronounceable_name: string;
    status: string;
    last_checked_at: string;
  };
}

interface Incident {
  id: string;
  attributes: {
    status: string;
    started_at: string;
    resolved_at: string | null;
    name: string;
  };
}

interface Heartbeat {
  id: string;
  attributes: {
    name: string;
    period: string;
    status: string;
  };
}

interface BetterStackResponse<T> {
  data: T[];
  pagination: {
    next: string | null;
  };
}

// 환경 변수 설정
const BETTER_STACK_API_KEY = process.env.BETTER_STACK_API_KEY || "";
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
const API_BASE_URL = "https://uptime.betterstack.com/api/v2";

// API 클라이언트 설정
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: `Bearer ${BETTER_STACK_API_KEY}`,
    "Content-Type": "application/json",
  },
});

class BetterStackBot {
  private client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on("ready", () => {
      console.log(`Logged in as ${this.client.user?.tag}`);
    });

    this.client.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      const args = message.content.split(" ");
      const command = args[0].toLowerCase();

      switch (command) {
        case "!status":
          await this.handleStatusCommand(message);
          break;
        case "!incidents":
          await this.handleIncidentsCommand(message);
          break;
        case "!heartbeats":
          await this.handleHeartBeatsCommand(message);
      }
    });
  }

  private async getMonitors(): Promise<BetterStackResponse<Monitor>> {
    try {
      const response = await api.get("/monitors");
      return response.data;
    } catch (error) {
      console.error("Error fetching monitors:", error);
      throw error;
    }
  }

  private async getIncidents(): Promise<BetterStackResponse<Incident>> {
    try {
      const response = await api.get("/incidents");
      return response.data;
    } catch (error) {
      console.error("Error fetching incidents:", error);
      throw error;
    }
  }

  private async getHeartbeats(): Promise<BetterStackResponse<Heartbeat>> {
    try {
      const response = await api.get("/heartbeats");
      return response.data;
    } catch (error) {
      console.error("Error fetching heartbeats:", error);
      throw error;
    }
  }

  private async handleStatusCommand(message: any): Promise<void> {
    try {
      const monitors = await this.getMonitors();

      const embed = new EmbedBuilder()
        .setTitle("시스템 상태")
        .setDescription("현재 모니터링 중인 서비스들의 상태입니다.")
        .setColor("#0099ff")
        .setTimestamp();

      monitors.data.forEach((monitor) => {
        const status =
          monitor.attributes.status === "up" ? "🟢 정상" : "🔴 다운";
        embed.addFields({
          name: monitor.attributes.pronounceable_name,
          value: `상태: ${status}\n마지막 확인: ${monitor.attributes.last_checked_at}`,
          inline: false,
        });
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply("상태 확인 중 오류가 발생했습니다.");
      console.error(error);
    }
  }

  private async handleIncidentsCommand(message: any): Promise<void> {
    try {
      const incidents = await this.getIncidents();

      const embed = new EmbedBuilder()
        .setTitle("최근 인시던트")
        .setDescription("발생한 최근 인시던트 목록입니다.")
        .setColor("#ff0000")
        .setTimestamp();

      incidents.data.slice(0, 5).forEach((incident) => {
        embed.addFields({
          name: `인시던트 #${incident.id}`,
          value: `이름: ${incident.attributes.name}\n상태: ${
            incident.attributes.status
          }\n시작 시간: ${incident.attributes.started_at}\n${
            incident.attributes.resolved_at
              ? `해결 시간: ${incident.attributes.resolved_at}`
              : "아직 해결되지 않음"
          }`,
          inline: false,
        });
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply("인시던트 확인 중 오류가 발생했습니다.");
      console.error(error);
    }
  }

  private async handleHeartBeatsCommand(message: any): Promise<void> {
    try {
      const heartbeats = await this.getHeartbeats();

      const embed = new EmbedBuilder()
        .setTitle("최근 하트비트")
        .setDescription("현재 하트비트 상태 목록입니다.")
        .setColor("#8A2BE2")
        .setTimestamp();

      heartbeats.data.slice(0, 5).forEach((heartbeat) => {
        embed.addFields({
          name: `하트비트 #${heartbeat.id}`,
          value: `이름: ${heartbeat.attributes.name}\n상태: ${heartbeat.attributes.status}\n주기: ${heartbeat.attributes.period}\n`,
          inline: false,
        });
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply("인시던트 확인 중 오류가 발생했습니다.");
      console.error(error);
    }
  }

  public start(): void {
    this.client.login(DISCORD_TOKEN);
  }
}

// 봇 실행
const bot = new BetterStackBot();
bot.start();
