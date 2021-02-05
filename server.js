const {basename} = require('path')
const {Client} = require('basic-ftp')
const contentDisposition = require('content-disposition')
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

app.use(cors({origin: true}))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

function w(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

app.get('*', w(async (req, res) => {
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

  res.set('Content-Length', size)
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', contentDisposition(basename(pathname)))
  res.status(200)

  if (req.method === 'GET') {
    await client.downloadTo(res, pathname).finally(() => client.close())
    return
  }

  if (req.method === 'HEAD') {
    res.end()
    client.close()
  }
}))

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Start listening on port ${port}`)
})
