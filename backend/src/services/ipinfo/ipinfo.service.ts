import dotenv from 'dotenv';

dotenv.config();

const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';
const IPINFO_BASE_URL = 'https://ipinfo.io';

interface IPInfoResponse {
  ip: string;
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country_code?: string;
  country?: string;
  continent_code?: string;
  continent?: string;
  city?: string;
  region?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  [key: string]: any;
}

class IPInfoService {
  private readonly token: string;

  constructor() {
    this.token = IPINFO_TOKEN;
  }

  private async fetchFromIPInfo(endpoint: string): Promise<any> {
    const url = new URL(endpoint, IPINFO_BASE_URL);

    if (this.token) {
      url.searchParams.append('token', this.token);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`IPInfo API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get IP information by IP address
   * @param ip - IP address (e.g., "8.8.8.8")
   */
  async getIPInfo(ip: string): Promise<IPInfoResponse> {
    try {
      const data = await this.fetchFromIPInfo(`/${ip}/json`);

      return {
        ip: data.ip || '',
        asn: data.asn || '',
        as_name: data.as_name || '',
        as_domain: data.as_domain || '',
        country_code: data.country || '',
        country: data.country_name || '',
        continent_code: data.continent?.code || '',
        continent: data.continent?.name || '',
        city: data.city || '',
        region: data.region || '',
        loc: data.loc || '',
        org: data.org || '',
        postal: data.postal || '',
        timezone: data.timezone || ''
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get IP info: ${error.message}`);
      }
      throw new Error('Failed to get IP info');
    }
  }
}

export const ipinfoService = new IPInfoService();
