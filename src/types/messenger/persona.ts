export type CreatePersonaPayload = {
	/** Display name shown as the sender's name. */
	name: string;
	/** Publicly accessible URL for the persona's avatar image. */
	profile_picture_url: string;
};

export type Persona = {
	id: string;
	name: string;
	profile_picture_url: string;
};

export type CreatePersonaResponse = { id: string };
