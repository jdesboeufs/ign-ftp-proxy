const {basename} = require('path')
const {Client} = require('basic-ftp')
const contentDisposition = require('content-disposition')

module.exports = async (req, res) => {
  const {host, username, password, pathname} = new URL(req.url.slice(1))

  if (host !== 'ftp3.ign.fr') {
    throw new Error('Seul le serveur ftp3.ign.fr est supporté ;)')
  }

  const client = new Client()
  let size

  try {
    await client.access({
      host,
      user: username,
      password,
      secure: false
    })
  } catch (error) {
    console.error(error)
    client.close()
    throw new Error('Connexion impossible')
  }

  try {
    size = await client.size(pathname)
  } catch (error) {
    console.error(error)
    client.close()
    throw new Error('Le fichier n’existe pas')
  }

  res.setHeader('Content-Length', size)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', contentDisposition(basename(pathname)))
  res.statusCode = 200

  if (req.method === 'GET') {
    await client.downloadTo(res, pathname).finally(() => client.close())
    return
  }

  if (req.method === 'HEAD') {
    res.end()
    client.close()
  }
}
