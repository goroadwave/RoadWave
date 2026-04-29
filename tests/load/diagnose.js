// Single-request diagnostic — what status is k6 actually receiving?
import http from 'k6/http'

export const options = { vus: 1, iterations: 3 }

export default function () {
  const res = http.get(
    'https://www.getroadwave.com/demo/oak-hollow-rv-resort',
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    },
  )
  console.log(
    `status=${res.status} url=${res.url} body_len=${res.body.length}`,
  )
}
