// Gemeinsame API-Utility-Typen

export type Cursor = string;
export type Limit = number;

export type Page<T> = {
  items: T[];
  nextCursor?: Cursor | null;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  status: number;
  error: ApiErrorPayload;
  requestId?: string;
};

export type ApiOk<T> = {
  status: 'ok';
  data: T;
};

export type ApiFail = {
  status: 'error';
  error: ApiErrorPayload;
};

export type ApiResponse<T> = ApiOk<T> | ApiFail;

export type Result<T, E = ApiErrorPayload> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type WithId<T> = T & { id: string };

// JWT / Auth
export type JwtClaims = {
  uid: string;
  email?: string | null;
  roles?: string[];
  // Standardfelder (iat/exp) kommen vom Signer
  [k: string]: unknown;
};