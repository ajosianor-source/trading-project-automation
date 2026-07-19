import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    normal: { executor: "constant-arrival-rate", rate: 20, timeUnit: "1s", duration: "30s", preAllocatedVUs: 10 },
    abusive: { executor: "constant-arrival-rate", rate: 150, timeUnit: "1s", duration: "10s", startTime: "10s", preAllocatedVUs: 50 },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
    checks: ["rate>0.95"],
  },
};

export default function () {
  const response = http.get(`${__ENV.STAGING_API_URL}/healthz`, {
    headers: { "X-Purpose-Of-Use": "operations" },
  });
  check(response, {
    "healthy or deliberately rate limited": (r) => r.status === 200 || r.status === 429,
  });
  sleep(0.1);
}
