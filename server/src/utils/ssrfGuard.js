import net from 'net';
import dns from 'dns';
import AppError from './appError.js';

export const ALLOWED_SMTP_PORTS = [25, 465, 587, 2525];

/**
 * Checks whether an IPv4 address belongs to loopback, private, link-local, multicast or reserved blocks
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateOrReservedIPv4(ip) {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Broadcast/Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;

  // 100.64.0.0/10 (Shared carrier space RFC 6598: 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1 documentation)
  if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;

  // 198.18.0.0/15 (Benchmarking: 198.18.0.0 - 198.19.255.255)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2 documentation)
  if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3 documentation)
  if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use: 240.0.0.0 - 255.255.255.254)
  if (b0 >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (ip === '255.255.255.255') return true;

  return false;
}

/**
 * Checks whether an IPv6 address belongs to loopback, unique-local, link-local, multicast or reserved blocks
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateOrReservedIPv6(ip) {
  const normalized = ip.toLowerCase().trim();

  // :: or ::0 (Unspecified)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0' || normalized === '::0') return true;

  // ::1 (Loopback)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith('::ffff:')) {
    const rawIpv4 = normalized.slice(7);
    if (net.isIPv4(rawIpv4)) {
      return isPrivateOrReservedIPv4(rawIpv4);
    }
    return true;
  }

  // fc00::/7 (Unique Local Address RFC 4193 - Private) -> fc00... to fdff...
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 (Link-Local unicast) -> fe8... to feb...
  if (/^fe[89ab]/i.test(normalized)) return true;

  // ff00::/8 (Multicast) -> ff...
  if (normalized.startsWith('ff')) return true;

  // 2001:db8::/32 (Documentation)
  if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return true;

  // 100::/64 (Discard-only)
  if (normalized.startsWith('100::')) return true;

  // 64:ff9b::/96 (IPv4/IPv6 translation)
  if (normalized.startsWith('64:ff9b:')) return true;

  return false;
}

/**
 * Validates any IP address (IPv4 or IPv6) against private, loopback, and reserved spaces
 * @param {string} ip
 * @returns {boolean} True if private, loopback, or reserved
 */
export function isPrivateOrReservedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const cleaned = ip.trim();
  const version = net.isIP(cleaned);

  if (version === 4) {
    return isPrivateOrReservedIPv4(cleaned);
  }
  if (version === 6) {
    return isPrivateOrReservedIPv6(cleaned);
  }

  return false;
}

/**
 * Validates an SMTP server hostname/IP and port to prevent SSRF vulnerabilities.
 * Resolves hostnames to all associated IP addresses and checks each against forbidden subnets.
 *
 * @param {string} host Hostname or IP of SMTP server
 * @param {number|string} port Port number of SMTP server
 * @returns {Promise<{ host: string, port: number, resolvedIps: string[] }>}
 */
export async function validateSmtpHostAndPort(host, port) {
  if (!host || typeof host !== 'string' || !host.trim()) {
    throw new AppError('SMTP host cannot be empty.', 400);
  }

  const cleanedHost = host.trim().toLowerCase();
  const numericPort = parseInt(port, 10);

  if (isNaN(numericPort) || !ALLOWED_SMTP_PORTS.includes(numericPort)) {
    throw new AppError(
      `Disallowed SMTP port ${port}. Only standard secure SMTP ports (${ALLOWED_SMTP_PORTS.join(', ')}) are permitted.`,
      400
    );
  }

  // 1. Literal host string blacklist
  const blockedHostnames = ['localhost', 'local', 'internal', 'metadata', 'instance-data'];
  if (blockedHostnames.includes(cleanedHost)) {
    throw new AppError(`SSRF Protection: Access to host "${cleanedHost}" is strictly prohibited.`, 400);
  }

  // 2. Prohibited domains / suffixes
  const blockedSuffixes = [
    '.localhost',
    '.local',
    '.internal',
    '.lan',
    '.arpa',
    '.localdomain',
    '.home.arpa',
    '.corp',
    '.onion',
  ];
  if (blockedSuffixes.some((suffix) => cleanedHost.endsWith(suffix))) {
    throw new AppError(`SSRF Protection: Access to internal domain "${cleanedHost}" is not allowed.`, 400);
  }

  // 3. If host is an IP literal, directly validate against reserved ranges
  const ipVersion = net.isIP(cleanedHost);
  if (ipVersion !== 0) {
    if (isPrivateOrReservedIp(cleanedHost)) {
      throw new AppError(`SSRF Protection: Target IP "${cleanedHost}" is a private, loopback, or reserved address.`, 400);
    }
    return { host: cleanedHost, port: numericPort, resolvedIps: [cleanedHost] };
  }

  // 4. Resolve hostname via DNS and check every resulting A/AAAA record
  let resolvedRecords;
  try {
    resolvedRecords = await dns.promises.lookup(cleanedHost, { all: true, verbatim: true });
  } catch (dnsErr) {
    throw new AppError(`Unable to resolve SMTP host "${cleanedHost}": ${dnsErr.message}`, 400);
  }

  if (!resolvedRecords || resolvedRecords.length === 0) {
    throw new AppError(`SMTP host "${cleanedHost}" did not resolve to any IP address.`, 400);
  }

  const resolvedIps = [];
  for (const record of resolvedRecords) {
    const ip = record.address;
    resolvedIps.push(ip);
    if (isPrivateOrReservedIp(ip)) {
      throw new AppError(
        `SSRF Protection: Hostname "${cleanedHost}" resolves to non-public address "${ip}". Connection rejected.`,
        400
      );
    }
  }

  return { host: cleanedHost, port: numericPort, resolvedIps };
}

/**
 * Validates that an HTTP/HTTPS remote API URL is safe from SSRF attacks.
 * Rejects localhost, loopback, private networks, cloud metadata, and internal TLDs.
 * Performs asynchronous DNS resolution to verify target addresses.
 *
 * @param {string} urlString Target URL string
 * @returns {Promise<{ url: string, hostname: string, port: number, resolvedIps: string[] }>}
 */
export async function validateRemoteHttpUrl(urlString) {
  if (!urlString || typeof urlString !== 'string' || !urlString.trim()) {
    throw new AppError('Remote API URL cannot be empty.', 400);
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch (err) {
    throw new AppError(`Invalid URL format: "${urlString}".`, 400);
  }

  // Require HTTPS in non-test environments
  if (process.env.NODE_ENV !== 'test' && parsed.protocol !== 'https:') {
    throw new AppError('Only secure HTTPS protocol is permitted for remote notification API endpoints.', 400);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError(`Disallowed protocol "${parsed.protocol}". Only HTTP/HTTPS is permitted.`, 400);
  }

  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);

  // 1. Blocked hostnames
  const blockedHostnames = ['localhost', 'local', 'internal', 'metadata', 'instance-data'];
  if (blockedHostnames.includes(hostname)) {
    throw new AppError(`SSRF Protection: Access to host "${hostname}" is strictly prohibited.`, 400);
  }

  // 2. Blocked suffixes
  const blockedSuffixes = [
    '.localhost',
    '.local',
    '.internal',
    '.lan',
    '.arpa',
    '.localdomain',
    '.home.arpa',
    '.corp',
    '.onion',
  ];
  if (blockedSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw new AppError(`SSRF Protection: Access to internal domain "${hostname}" is not allowed.`, 400);
  }

  // 3. Literal IP checks
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new AppError(`SSRF Protection: Target IP "${hostname}" is a private, loopback, or reserved address.`, 400);
    }
    return { url: parsed.toString(), hostname, port, resolvedIps: [hostname] };
  }

  // 4. DNS resolution checks
  let resolvedRecords;
  try {
    resolvedRecords = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch (dnsErr) {
    throw new AppError(`Unable to resolve hostname "${hostname}": ${dnsErr.message}`, 400);
  }

  if (!resolvedRecords || resolvedRecords.length === 0) {
    throw new AppError(`Hostname "${hostname}" did not resolve to any IP address.`, 400);
  }

  const resolvedIps = [];
  for (const record of resolvedRecords) {
    const ip = record.address;
    resolvedIps.push(ip);
    if (isPrivateOrReservedIp(ip)) {
      throw new AppError(`SSRF Protection: Hostname "${hostname}" resolves to non-public address "${ip}". Connection rejected.`, 400);
    }
  }

  return { url: parsed.toString(), hostname, port, resolvedIps };
}

/**
 * Creates a secure custom lookup function for Nodemailer / net socket connections.
 * Resolves DNS at socket connection time and validates the IP to eliminate DNS rebinding & TOCTOU.
 *
 * @returns {Function} Custom lookup function conforming to dns.lookup signature
 */
export function createSecureLookup() {
  return (hostname, options, callback) => {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = {};
    }

    dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
      if (err) return cb(err);

      if (!addresses || addresses.length === 0) {
        return cb(new Error(`DNS resolution returned no addresses for ${hostname}`));
      }

      // Verify every resolved address
      for (const entry of addresses) {
        if (isPrivateOrReservedIp(entry.address)) {
          const ssrfError = new Error(
            `SSRF Protection: Hostname "${hostname}" resolved to blocked IP "${entry.address}". Connection aborted.`
          );
          ssrfError.code = 'ERR_SSRF_BLOCKED';
          return cb(ssrfError);
        }
      }

      // If callers requested all: true, return array; otherwise return first match
      if (opts?.all) {
        return cb(null, addresses);
      }

      const first = addresses[0];
      return cb(null, first.address, first.family);
    });
  };
}
