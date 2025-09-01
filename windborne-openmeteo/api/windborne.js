export default async function handler(req, res) {
  try {
    const { file } = req.query;

    if (!file) {
      return res.status(400).json({ error: "Missing `file` parameter" });
    }

    const upstream = await fetch(`https://a.windbornesystems.com/treasure/${file}.json`);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Failed to fetch upstream" });
    }

    const text = await upstream.text();

    // The Windborne JSON may be malformed sometimes, so don't JSON.parse blindly
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(text);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}