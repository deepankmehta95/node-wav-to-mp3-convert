const express = require('express')
const fs = require('fs')
const unzipper = require('unzipper')
const { transcodeMediaFile } = require('symbl-media')
const cron = require('node-cron')
const nodemailer = require('nodemailer')

const app = express()

// Custom Data for Extraction
let directory = '/home/rms/recordings/0/100270/auto_rec/'
let wavDirectory = '/home/extracted_recordings/wav/'
let mp3Directory = '/home/extracted_recordings/mp3/'

cron.schedule('00 22 * * *', () => {
  // Get Todays Date
  let today = new Date()
  let dd = String(today.getDate()).padStart(2, '0')
  let mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  let yyyy = today.getFullYear()

  let date = yyyy + '-' + mm + '-' + dd

  // Nodemailer settings
  let transporter = nodemailer.createTransport({
    host: 'smtp.zoho.in',
    port: '465',
    secure: 'true',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  })

  let mailOptions = {
    from: '"HRMS" <deepank.mehta@managementser.com>',
    to: process.env.IT_EMAIL,
    cc: process.env.ADMIN_EMAIL,
    subject: 'Recordings Summary | ' + date,
    text: '',
  }

  // Extract All
  extractAll(date, transporter, mailOptions)
})

async function extractAll(date, transporter, mailOptions) {
  fs.readdir(directory + date, async (err, files) => {
    if (err) {
      console.log(err)
      return
    }
    // Unzipping
    for (const file of files) {
      await extract(date, file)
    }

    console.log('done extracting, now start converting')
    // Conversion to mp3
    mp3(date, transporter, mailOptions)
  })
}

// Extract method
async function extract(date, file) {
  const fileContents = fs.createReadStream(directory + date + '/' + file)
  let fileName = ''
  await fileContents
    .pipe(unzipper.Parse())
    .on('entry', async (entry) => {
      fileName = entry.path
      entry.pipe(fs.createWriteStream(wavDirectory + date + '/' + fileName))
    })
    .promise()
    .then(() => {
      console.log(fileName + ' extraction done.')
    })
    .catch((e) => {
      console.log(e)
    })
}

// mp3 convert method
async function mp3(date, transporter, mailOptions) {
  fs.readdir(wavDirectory + date, async (err, files) => {
    if (err) {
      console.log(err)
      return
    }
    // Unzipping
    for (const file of files) {
      let filename = file.replace('.wav', '')
      try {
        const result = await transcodeMediaFile(
          wavDirectory + date + '/' + filename + '.wav',
          mp3Directory + date + '/' + filename + '.mp3',
          'mp3'
        )
        console.log('Successfully transcoded to: ', result.outPath)
      } catch (e) {
        console.error(e)
      }
    }

    console.log('done converting')

    fs.unlinkSync(wavDirectory + date)

    console.log('done deleting the ' + date + ' folder from wav directory')

    mailOptions.text = `
      Hello there,

      Recordings rename process has finished successfully.
      
      Thank You,
      Deepank Mehta`

    transporter.sendMail(mailOptions, (err, data) => {
      if (err) {
        console.log(err)
      }
      console.log('Email sent successfully')
    })
  })
}

const PORT = process.env.PORT || 6000

app.listen(PORT, console.log(`Server running on port ${PORT}`))
