import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://groupsave:groupsave@localhost:5432/groupsave',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  encKey: process.env.ENC_KEY || 'dev-enc-key',
  gatewaySecret: process.env.GATEWAY_SECRET || 'dev-gateway-secret',
  atUsername: process.env.AT_USERNAME || 'sandbox',
  atApiKey: process.env.AT_API_KEY || '',
  atSenderId: process.env.AT_SENDER_ID || '',
  // Video meetings use Jitsi Meet. Point this at your own Jitsi server to keep video off public servers.
  jitsiBase: (process.env.JITSI_BASE_URL || 'https://meet.jit.si').replace(/\/+$/, ''),
  // Public address of the website, used for tap-to-join links in SMS invitations. Set APP_URL when you host it online.
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

if (process.env.NODE_ENV === 'production') {
  for (const k of ['JWT_SECRET', 'ENC_KEY', 'GATEWAY_SECRET']) {
    if (!process.env[k]) throw new Error(`${k} must be set in production`);
  }
}
