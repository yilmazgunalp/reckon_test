
const express = require('express')
const axios = require('axios')
const cors = require('cors');
const path = require('path')
const bodyParser = require('body-parser')

const {from, of, defer} = require('rxjs')
const {concat, mergeMap, map, retryWhen,tap, mapTo} = require('rxjs/operators')

//Test 1 functions
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

//Test 2 functions
const textToSearchUrl = "https://join.reckon.com/test2/textToSearch";
const subTextsUrl = "https://join.reckon.com/test2/subTexts"
const submitUrl = "https://join.reckon.com/test2/submitResults"

 const gettextToSearch = () => from(axios.get(textToSearchUrl));
 const getsubTexts = () => from(axios.get(subTextsUrl));
 const postSubmit = (body) => from(axios.post(submitUrl));

 const findSubText = (pattern, textToSearch) => {

  let pos = []
  for (let i=0; i <textToSearch.length; i++) {
  
      if(pattern[0].toLowerCase() === textToSearch[i].toLowerCase()) {
        let temp = ""
        let endIndex= i + pattern.length;
        for (let j=i; j <endIndex; j++) {
          temp = temp.concat(textToSearch[j])
      }
    temp.toLowerCase() === pattern.toLowerCase() ? pos.push(i+1) : "nothing"
  
      }
  }
  return pos.length == 0 ? "<No Output>" : pos;
  }
  
  const createResults = (textToSearch, subtexts) => {
    const results = subtexts.map(subtext => {
      let res = findSubText(subtext,textToSearch);
      return {
        subtext,
        result: Array.isArray(res) ? res.join(", ") : res
      }
    })
    return {
      candidate: "Yilmaz Gunduzalp",
      text: textToSearch,
      results
    }
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
  .get('/search', async (req, res) => {
    defer(gettextToSearch).pipe(
      retryWhen((textToSearchError) => textToSearchError
      .pipe(tap(() => console.log("textToSearch endpoint failed, retrying...")),
      mapTo(textToSearchError))),
      mergeMap((textToSearchRes) => 
      defer(getsubTexts).
      pipe(
        retryWhen((subTextsError) => subTextsError
      .pipe(tap(() => console.log("subTexts endpoint failed, retrying...")),
      mapTo(subTextsError))),
        map((subTextsRes) => createResults(textToSearchRes.data["text"], subTextsRes.data["subTexts"]))))
    ).subscribe((result) => res.send(result), (err) => console.log(err))
    })
  .listen(9999, () => console.log(`Listening on 9999`))

