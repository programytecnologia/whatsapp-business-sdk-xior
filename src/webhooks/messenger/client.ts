import express, { json, Router, urlencoded } from "express";
import type { MessengerWebhookEvents } from "../../types/messenger";
import { captureRawBody, getWebhookController, verifyHubSignature } from "../helpers";
import { postMessengerWebhookController } from "./helpers";

export interface MessengerWebhookClientArgs {
  /**
   * Use this option if you want to use your own express application.
   */
  expressApp?: {
    app: express.Application;
    /**
     * If the app should start listening on the specified port when initializing the webhook router.
     */
    shouldStartListening: boolean;
  };
  /**
   * The server port, defaults to: 8080
   */
  port?: number;
  /**
   * The url for the endpoint. Defaults to "/webhook".
   */
  path?: string;
  /**
   * The token you provided for this endpoint. Used to authenticate the webhook subscription.
   */
  token: string;
  /**
   * Your Meta App Secret. When provided, every incoming POST is verified against the
   * `X-Hub-Signature-256` header and rejected with 403 on mismatch.
   *
   * If using a custom `expressApp`, also add `app.use(express.json({ verify: captureRawBody }))`.
   */
  appSecret?: string;
}

/**
 * Use this client to easily initialize a Messenger Platform webhook listener.
 * Before anything, make sure your server has an https connection.
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform/webhooks
 */
export class MessengerWebhookClient {
  private path: string;
  private port: number;
  private token: string;
  private appSecret?: string;
  protected router: Router;
  expressApp?: MessengerWebhookClientArgs["expressApp"];

  constructor({ path, port, expressApp, token, appSecret }: MessengerWebhookClientArgs) {
    this.path = path || "/webhook";
    this.port = port || 8080;
    this.router = Router();
    this.token = token;
    this.appSecret = appSecret;
    if (expressApp) this.expressApp = expressApp;
  }

  /**
   * Initializes the webhook listener server with the provided events.
   */
  initWebhook(events?: MessengerWebhookEvents) {
    if (!this.expressApp) {
      this.expressApp = {
        app: express(),
        shouldStartListening: true,
      };
      this.expressApp.app.use(this.appSecret ? json({ verify: captureRawBody }) : json());
      this.expressApp.app.use(urlencoded({ extended: false }));
    }

    // Webhook subscription verification (GET)
    this.router.get("/", getWebhookController(this.token));

    // Incoming events (POST)
    if (this.appSecret) {
      this.router.post(
        "/",
        verifyHubSignature(this.appSecret),
        postMessengerWebhookController(events || {}),
      );
    } else {
      this.router.post("/", postMessengerWebhookController(events || {}));
    }

    this.expressApp.app.use(this.path, this.router);

    if (this.expressApp.shouldStartListening)
      this.expressApp.app.listen(this.port, events?.onStartListening);
  }
}
