const express = require('express')
const fs = require('fs')
const unzipper = require('unzipper')
const { transcodeMediaFile } = require('symbl-media')

const app = express()

// Custom Data for Extraction
let date = '2021-04-23'
let directory = '/home/rms/recordings/0/100270/auto_rec/'
let wavDirectory = '/home/extracted_recordings/wav/'
let mp3Directory = '/home/extracted_recordings/mp3/'

// Extract All
extractAll(date)

async function extractAll(date) {
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
    mp3(date)
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
async function mp3(date) {
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
  })
}

app.listen(6000, () => {
  console.log('app connected')
})
