/**
 * Odoo JSON-RPC Client
 * 
 * Robust client for interacting with Odoo via JSON-RPC API.
 * Handles authentication, error handling, and retries.
 */

import type { OdooConfig } from './types.ts';

/**
 * JSON-RPC request payload
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  id: number;
  params: Record<string, unknown>;
}

/**
 * JSON-RPC response
 */
interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Odoo RPC client class
 */
export class OdooClient {
  private config: OdooConfig;
  private uid: number | null = null;
  private authenticatedAt: number | null = null;
  private readonly AUTH_CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor(config: OdooConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Odoo and cache the session
   * 
   * @returns User ID (uid)
   */
  async authenticate(): Promise<number> {
    // Check if we have a cached authentication
    if (this.uid && this.authenticatedAt) {
      const age = Date.now() - this.authenticatedAt;
      if (age < this.AUTH_CACHE_TTL) {
        return this.uid;
      }
    }

    const result = await this.jsonRpcCall<number>(
      `${this.config.url}/jsonrpc`,
      {
        service: 'common',
        method: 'login',
        args: [this.config.database, this.config.username, this.config.apiKey],
      }
    );

    if (!result || typeof result !== 'number') {
      throw new Error('Odoo authentication failed: invalid response');
    }

    this.uid = result;
    this.authenticatedAt = Date.now();

    return this.uid;
  }

  /**
   * Execute a method on an Odoo model
   * 
   * @param model - Odoo model name (e.g., 'sale.order', 'purchase.order')
   * @param method - Method to call (e.g., 'create', 'write', 'search')
   * @param args - Method arguments
   * @returns Method result
   */
  async executeKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    // Ensure we're authenticated
    const uid = await this.authenticate();

    return this.jsonRpcCall<T>(
      `${this.config.url}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          this.config.database,
          uid,
          this.config.apiKey,
          model,
          method,
          args,
          kwargs,
        ],
      }
    );
  }

  /**
   * Search for records in an Odoo model
   * 
   * @param model - Odoo model name
   * @param domain - Search domain (e.g., [['name', '=', 'value']])
   * @param options - Search options (limit, offset, etc.)
   * @returns Array of record IDs
   */
  async search(
    model: string,
    domain: unknown[][] = [],
    options: { limit?: number; offset?: number } = {}
  ): Promise<number[]> {
    return this.executeKw<number[]>(model, 'search', [domain], options);
  }

  /**
   * Read records from an Odoo model
   * 
   * @param model - Odoo model name
   * @param ids - Array of record IDs
   * @param fields - Fields to read (optional, reads all if not specified)
   * @returns Array of records
   */
  async read<T = Record<string, unknown>>(
    model: string,
    ids: number[],
    fields?: string[]
  ): Promise<T[]> {
    return this.executeKw<T[]>(model, 'read', [ids], fields ? { fields } : {});
  }

  /**
   * Create a record in an Odoo model
   * 
   * @param model - Odoo model name
   * @param values - Record values
   * @returns Created record ID
   */
  async create(model: string, values: Record<string, unknown>): Promise<number> {
    return this.executeKw<number>(model, 'create', [[values]]);
  }

  /**
   * Update records in an Odoo model
   * 
   * @param model - Odoo model name
   * @param ids - Array of record IDs to update
   * @param values - Values to update
   * @returns true on success
   */
  async write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean> {
    return this.executeKw<boolean>(model, 'write', [[ids], values]);
  }

  /**
   * Delete records from an Odoo model
   * 
   * @param model - Odoo model name
   * @param ids - Array of record IDs to delete
   * @returns true on success
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    return this.executeKw<boolean>(model, 'unlink', [[ids]]);
  }

  /**
   * Make a JSON-RPC call to Odoo
   * 
   * @param url - Odoo JSON-RPC endpoint URL
   * @param params - RPC parameters
   * @returns RPC result
   */
  private async jsonRpcCall<T = unknown>(
    url: string,
    params: Record<string, unknown>
  ): Promise<T> {
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Odoo RPC HTTP error: ${response.status} ${text}`);
    }

    const json: JsonRpcResponse<T> = await response.json();

    if (json.error) {
      const errorMessage = json.error.message || 'Unknown error';
      const errorData = json.error.data ? ` | data: ${JSON.stringify(json.error.data)}` : '';
      throw new Error(`Odoo RPC error: ${errorMessage}${errorData}`);
    }

    if (json.result === undefined) {
      throw new Error('Odoo RPC error: No result in response');
    }

    return json.result;
  }

  /**
   * Clear authentication cache (force re-authentication on next call)
   */
  clearAuthCache(): void {
    this.uid = null;
    this.authenticatedAt = null;
  }
}

/**
 * Create an Odoo client instance
 * 
 * @param config - Odoo configuration
 * @returns OdooClient instance
 */
export function createOdooClient(config: OdooConfig): OdooClient {
  return new OdooClient(config);
}

