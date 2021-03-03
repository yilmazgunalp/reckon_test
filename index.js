
const express = require('express')
const axios = require('axios')
const cors = require('cors');
const path = require('path')
const bodyParser = require('body-parser')

const {from, of, defer} = require('rxjs')
const {concat, mergeMap, map, retryWhen,tap, mapTo} = require('rxjs/operators')

const rangeUrl = "https://join.reckon.com/test1/rangeInfo";
const divisorUrl = "https://join.reckon.com/test1/divisorInfo"

 const getDivisors = () => from(axios.get(divisorUrl));
 const getRange = () => from(axios.get(rangeUrl));

 const checkDivision = (num,divisor) => {
   return num % divisor["divisor"] === 0 ? divisor["output"] : "" ;
 }
 const createResponse = (range, divisor) => {
   let result= "";
   for (let i = range["lower"]; i <= range["upper"]; i++) {
    result = result.concat("<p>",i,":",checkDivision(i,divisor["outputDetails"][0]), checkDivision(i,divisor["outputDetails"][1]),  "</p>")
  }
return result;
}

express()
  .use(cors())
  .use(bodyParser.text({ type:  'text/plain'}))
  .get('/', async (req, res) => {
  defer(getRange).pipe(
    retryWhen((rangeError) => rangeError
    .pipe(tap(() => console.log("Range endpoint failed, retrying...")),
    mapTo(rangeError))),
    mergeMap((rangeRes) => 
    defer(getDivisors).
    pipe(
      retryWhen((divisorError) => divisorError
    .pipe(tap(() => console.log("Divisor endpoint failed, retrying...")),
    mapTo(divisorError))),
      map((divisorRes) => createResponse(rangeRes.data, divisorRes.data))))
  ).subscribe((result) => res.send(result.toString()), (err) => console.log(err))
  })
  .listen(9999, () => console.log(`Listening on 9999`))

