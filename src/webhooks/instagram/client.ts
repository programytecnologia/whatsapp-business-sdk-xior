import express, { json, Router, urlencoded } from "express";
import type { InstagramWebhookEvents } from "../../types/instagram";
import { captureRawBody, getWebhookController, verifyHubSignature } from "../helpers";
import { postInstagramWebhookController } from "./helpers";

export interface InstagramWebhookClientArgs {
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
 * Use this client to easily initialize an Instagram Messaging webhook listener.
 * Before anything, make sure your server has an https connection.
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook
 */
export class InstagramWebhookClient {
  private path: string;
  private port: number;
  private token: string;
  private appSecret?: string;
  protected router: Router;
  expressApp?: InstagramWebhookClientArgs["expressApp"];

  constructor({ path, port, expressApp, token, appSecret }: InstagramWebhookClientArgs) {
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
  initWebhook(events?: InstagramWebhookEvents) {
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
        postInstagramWebhookController(events || {}),
      );
    } else {
      this.router.post("/", postInstagramWebhookController(events || {}));
    }

    this.expressApp.app.use(this.path, this.router);

    if (this.expressApp.shouldStartListening)
      this.expressApp.app.listen(this.port, events?.onStartListening);
  }
}
