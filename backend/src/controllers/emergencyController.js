// The emergency number(s) are configurable via environment variables so they
// can be changed per-deployment/region without a code change.
const DEFAULT_SERVICE_NUMBER = '112'; // India's unified emergency number
const DEFAULT_CONTACT_NUMBER = '';

export function getConfig(req, res) {
  res.json({
    emergencyServiceNumber: process.env.EMERGENCY_SERVICE_NUMBER || DEFAULT_SERVICE_NUMBER,
    emergencyContactNumber: process.env.EMERGENCY_CONTACT_NUMBER || DEFAULT_CONTACT_NUMBER,
  });
}
