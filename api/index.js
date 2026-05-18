module.exports = (req, res) => {
  res.json({ ok: true, path: req.path, method: req.method });
};
