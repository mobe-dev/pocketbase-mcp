import PocketBase, { BaseAuthStore } from 'pocketbase';
import { EventSource } from 'eventsource';
import type { Config } from './config.js';
Object.assign(globalThis, { EventSource });
export class Context {
  readonly user: PocketBase;
  readonly admin: PocketBase;
  private login?: Promise<void>;
  constructor(readonly config: Config) {
    this.user = new PocketBase(config.url, new BaseAuthStore());
    this.admin = new PocketBase(config.url, new BaseAuthStore());
    this.user.autoCancellation(false); this.admin.autoCancellation(false);
    if (config.token) this.admin.authStore.save(config.token);
  }
  async client(admin = false) {
    if (!admin) return this.user;
    if (!this.admin.authStore.isValid) {
      if (!this.config.email || !this.config.password) throw new Error('Superuser authentication required; configure credentials or authenticate_user with isAdmin');
      this.login ??= this.admin.collection('_superusers').authWithPassword(this.config.email, this.config.password).then(() => {}).finally(() => { this.login = undefined; });
      await this.login;
    }
    return this.admin;
  }
  async close() { await Promise.all([this.user.realtime.unsubscribe(), this.admin.realtime.unsubscribe()]); this.user.cancelAllRequests(); this.admin.cancelAllRequests(); }
}
