import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TAbstractFile,
} from "obsidian";

interface AutoTimestampSettings {
  dateFormat: string;
  createdKey: string;
  modifiedKey: string;
  ignorePatterns: string[];
}

const DEFAULT_SETTINGS: AutoTimestampSettings = {
  dateFormat: "yyyy-MM-ddTHH:mm:ss",
  createdKey: "created",
  modifiedKey: "modified",
  ignorePatterns: [],
};

export default class AutoTimestampPlugin extends Plugin {
  settings: AutoTimestampSettings;
  private isUpdating: boolean = false;

  async onload() {
    await this.loadSettings();

    // ファイル作成時のイベント
    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          await this.handleFileCreate(file);
        }
      })
    );

    // ファイル変更時のイベント
    this.registerEvent(
      this.app.vault.on("modify", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          await this.handleFileModify(file);
        }
      })
    );

    // 設定タブを追加
    this.addSettingTab(new AutoTimestampSettingTab(this.app, this));

    console.log("Auto Timestamp plugin loaded");
  }

  onunload() {
    console.log("Auto Timestamp plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * 日付を指定フォーマットに変換
   */
  formatDate(date: Date): string {
    const format = this.settings.dateFormat;
    
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return format
      .replace("yyyy", year)
      .replace("MM", month)
      .replace("dd", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * ファイルが無視パターンにマッチするかチェック
   */
  shouldIgnoreFile(file: TFile): boolean {
    return this.settings.ignorePatterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(file.path);
    });
  }

  /**
   * 新規ファイル作成時の処理
   */
  async handleFileCreate(file: TFile): Promise<void> {
    if (this.isUpdating || this.shouldIgnoreFile(file)) return;

    // 少し待ってからファイルを読み込む（ファイルが完全に作成されるのを待つ）
    await this.delay(100);

    const content = await this.app.vault.read(file);
    const now = this.formatDate(new Date());

    const updatedContent = this.addFrontmatter(content, now, now);

    if (updatedContent !== content) {
      this.isUpdating = true;
      await this.app.vault.modify(file, updatedContent);
      this.isUpdating = false;
    }
  }

  /**
   * ファイル変更時の処理
   */
  async handleFileModify(file: TFile): Promise<void> {
    if (this.isUpdating || this.shouldIgnoreFile(file)) return;

    const content = await this.app.vault.read(file);
    const now = this.formatDate(new Date());

    const updatedContent = this.updateModifiedTime(content, now);

    if (updatedContent !== content) {
      this.isUpdating = true;
      await this.app.vault.modify(file, updatedContent);
      this.isUpdating = false;
    }
  }

  /**
   * フロントマターを追加または更新
   */
  addFrontmatter(content: string, created: string, modified: string): string {
    const { createdKey, modifiedKey } = this.settings;
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (match) {
      // 既存のフロントマターがある場合
      let frontmatter = match[1];

      // created がなければ追加
      if (!new RegExp(`^${createdKey}:`, "m").test(frontmatter)) {
        frontmatter = `${createdKey}: ${created}\n${frontmatter}`;
      }

      // modified がなければ追加
      if (!new RegExp(`^${modifiedKey}:`, "m").test(frontmatter)) {
        frontmatter = `${frontmatter}\n${modifiedKey}: ${modified}`;
      }

      return content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
    } else {
      // フロントマターがない場合は新規作成
      const newFrontmatter = `---\n${createdKey}: ${created}\n${modifiedKey}: ${modified}\n---\n`;
      return newFrontmatter + content;
    }
  }

  /**
   * modified時刻のみ更新
   */
  updateModifiedTime(content: string, modified: string): string {
    const { createdKey, modifiedKey } = this.settings;
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      // フロントマターがない場合は何もしない（createで処理されるはず）
      return content;
    }

    let frontmatter = match[1];
    const modifiedRegex = new RegExp(`^(${modifiedKey}:).*$`, "m");

    if (modifiedRegex.test(frontmatter)) {
      // modified が既存の場合は更新
      frontmatter = frontmatter.replace(
        modifiedRegex,
        `$1 ${modified}`
      );
    } else {
      // modified がない場合は追加
      frontmatter = `${frontmatter}\n${modifiedKey}: ${modified}`;
    }

    // created がなければ追加（念のため）
    if (!new RegExp(`^${createdKey}:`, "m").test(frontmatter)) {
      frontmatter = `${createdKey}: ${modified}\n${frontmatter}`;
    }

    return content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
  }

  /**
   * 指定ミリ秒待機
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 設定タブ
 */
class AutoTimestampSettingTab extends PluginSettingTab {
  plugin: AutoTimestampPlugin;

  constructor(app: App, plugin: AutoTimestampPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Auto Timestamp Settings" });

    new Setting(containerEl)
      .setName("Date format")
      .setDesc("Format for timestamps (default: yyyyMMddHHmmss)")
      .addText((text) =>
        text
          .setPlaceholder("yyyyMMddHHmmss")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value || "yyyyMMddHHmmss";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Created key")
      .setDesc("YAML key for creation time")
      .addText((text) =>
        text
          .setPlaceholder("created")
          .setValue(this.plugin.settings.createdKey)
          .onChange(async (value) => {
            this.plugin.settings.createdKey = value || "created";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Modified key")
      .setDesc("YAML key for modification time")
      .addText((text) =>
        text
          .setPlaceholder("modified")
          .setValue(this.plugin.settings.modifiedKey)
          .onChange(async (value) => {
            this.plugin.settings.modifiedKey = value || "modified";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Ignore patterns")
      .setDesc("Regex patterns for files to ignore (one per line)")
      .addTextArea((text) =>
        text
          .setPlaceholder("templates/.*\ndaily/.*")
          .setValue(this.plugin.settings.ignorePatterns.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.ignorePatterns = value
              .split("\n")
              .map((p) => p.trim())
              .filter((p) => p.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }
}
