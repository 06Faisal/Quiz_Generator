# Quiz Generator

Name a topic, get a set of multiple-choice questions with the correct option
already marked and a one-line reason for it. Built on Flask and the Google
Gemini API.

## Run it locally

```bash
pip install -r requirements.txt
cp .env.example .env      # then put your Gemini API key in it
python app.py
```

Open http://localhost:5000.

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Configuration

| Variable | Required | What it does |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Authenticates calls to the Gemini API. |
| `APP_PASSWORD` | no | When set, the app asks for this password over HTTP Basic auth. Set it on any public deployment. |
| `FLASK_DEBUG` | no | `1` runs the Flask debugger. Local use only — the debugger allows arbitrary code execution. |

## Deploying

The included `vercel.json` deploys to Vercel as-is. Set `GEMINI_API_KEY` and
`APP_PASSWORD` as environment variables in the project settings.

**Set `APP_PASSWORD` before you deploy.** Without it, anyone who finds the URL
can generate questions on your API key and your bill. The built-in rate limit
(10 requests per minute per IP) slows that down but does not stop it, and on
serverless it is counted per instance rather than globally.

## How it works

`POST /generate` takes `{topic, num_questions, difficulty}`, asks Gemini for a
JSON array of questions, validates the shape of what comes back, and returns it.
The frontend renders each question as a row of answer options with the correct
one marked in red pen.

Malformed or partial model output is dropped rather than rendered: a question is
only returned if it has non-empty text, exactly the options A/B/C/D as strings,
and an answer that is one of those four letters.

## Security

The app is hardened against the ways a small AI-backed service usually gets
abused:

- **Same-origin only.** No CORS headers, so another site cannot call `/generate`
  from a user's browser and spend your quota.
- **Rate limited.** 10 requests per minute per IP.
- **Request size capped** at 16 KB, and topics at 200 characters, so a large
  body cannot be used to run up token costs.
- **Input validated.** Topic type and length, question count range, and
  difficulty are all checked before any API call is made.
- **Errors stay generic.** Clients get a short message; exceptions and traces go
  to the server log, so internal details and key fragments are not echoed back.
- **Prompt injection contained.** The topic is passed inside delimiters with an
  explicit instruction to ignore anything inside it. Model output is
  shape-validated and HTML-escaped before rendering, so an injected payload
  cannot become script on the page.
- **Security headers** on every response: a CSP with `script-src 'self'` and no
  inline scripts, plus `nosniff`, `no-referrer`, `X-Frame-Options: DENY`, and
  `frame-ancestors 'none'`.
- **Debugger off by default.** Opt in with `FLASK_DEBUG=1` for local work only.
- **Optional password gate** via `APP_PASSWORD`, compared with
  `hmac.compare_digest`.

Found a problem? Open an issue.

## Stack

Flask · Google Gemini (`gemini-2.5-flash`) · vanilla JavaScript, no build step
