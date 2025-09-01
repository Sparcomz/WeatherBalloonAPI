export default async function handler(req, res) {
  const { id } = req.query; // e.g. "00", "01", etc.

  try {
    const upstream = await fetch(`https://a.windbornesystems.com/treasure/${id}.json`);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Failed to fetch upstream" });
    }

    const text = await upstream.text();

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(text);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
