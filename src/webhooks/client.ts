import express, { json, Router, urlencoded } from "express";
import type { WebhookEvents } from "../types";
import {
  captureRawBody,
  getWebhookController,
  postWebhookController,
  verifyHubSignature,
} from "./helpers";

export interface WebhookClientArgs {
  /**
   * Use this option if you want to use your own express application
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
   * the url for the endpoint, example: { "path": "/whatsapp/business" }.
   *
   * if not provided will default to: "/webhook".
   */
  path?: string;
  /**
   * The token you provided for this endpoint. It is used to authenticate the webhook.
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
 * Use this client if you want to easily initialize webhook connections.
 * Before anything, make sure your server has an https connection.
 * For more info, check the docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 */
export class WebhookClient {
  private path: string;
  private port: number;
  private token: string;
  private appSecret?: string;
  protected router: Router;
  expressApp?: WebhookClientArgs["expressApp"];

  constructor({ path, port, expressApp, token, appSecret }: WebhookClientArgs) {
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
  initWebhook(events?: WebhookEvents) {
    //If the express app param is not passed, then create a general application
    if (!this.expressApp) {
      this.expressApp = {
        app: express(),
        shouldStartListening: true,
      };
      this.expressApp.app.use(this.appSecret ? json({ verify: captureRawBody }) : json());
      this.expressApp.app.use(urlencoded({ extended: false }));
    }

    //Webhook subscription
    this.router.get("/", getWebhookController(this.token));

    //Listen to the webhook events
    if (this.appSecret) {
      this.router.post(
        "/",
        verifyHubSignature(this.appSecret),
        postWebhookController(events || {}),
      );
    } else {
      this.router.post("/", postWebhookController(events || {}));
    }

    //Route requests
    this.expressApp.app.use(this.path, this.router);

    //Start listening
    if (this.expressApp.shouldStartListening)
      this.expressApp.app.listen(this.port, events?.onStartListening);
  }
}
