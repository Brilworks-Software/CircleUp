
async function fetchResults(url: string) {
  try {

    const response = await fetch(`https://asia-south1-circleup-63110.cloudfunctions.net/serpSearch?q=${encodeURIComponent(url)}`);

    const data = await response.json();

//     const data = {
//   "search_metadata": {
//     "id": "6992b3f895a69475241656f1",
//     "status": "Success",
//     "json_endpoint": "https://serpapi.com/searches/3yA8oFsbOP9oU89HZ0QMdw/6992b3f895a69475241656f1.json",
//     "pixel_position_endpoint": "https://serpapi.com/searches/3yA8oFsbOP9oU89HZ0QMdw/6992b3f895a69475241656f1.json_with_pixel_position",
//     "created_at": "2026-02-16 06:06:48 UTC",
//     "processed_at": "2026-02-16 06:06:48 UTC",
//     "google_url": "https://www.google.com/search?q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&oq=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&hl=en&gl=in&sourceid=chrome&ie=UTF-8",
//     "raw_html_file": "https://serpapi.com/searches/3yA8oFsbOP9oU89HZ0QMdw/6992b3f895a69475241656f1.html",
//     "total_time_taken": 0.89
//   },
//   "search_parameters": {
//     "engine": "google",
//     "q": "https://www.linkedin.com/in/vikas-singh-bril/",
//     "google_domain": "google.com",
//     "hl": "en",
//     "gl": "in",
//     "device": "desktop"
//   },
//   "search_information": {
//     "query_displayed": "https://www.linkedin.com/in/vikas-singh-bril/",
//     "total_results": 2440,
//     "time_taken_displayed": 0.59,
//     "organic_results_state": "Results for exact spelling"
//   },
//   "related_questions": [
//     {
//       "question": "What are the famous cases of Vikas Singh?",
//       "type": "featured_snippet",
//       "snippet": "He is the only lawyer in India who has been associated with three prominent temple cases in India, i.e., the Ayodhya Ram Temple, Guru Ravidas Temple at Tughlaqabad and Balayogi Shri Sadanand Maharaj Ashram in Maharashtra, emerging victorious in all three of them.",
//       "title": "Mr. Vikas Singh President, Supreme Court Bar Association Former ...",
//       "link": "https://amity.edu/astif/Admin/Uploads/44Dr%20Vikas%20Singh.pdf",
//       "displayed_link": "https://amity.edu › astif › Admin › Uploads",
//       "source_logo": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/V1JcHTx-4v7FvsC_Cdpti21kGO5vGiUyjgBLtMgynyw.png",
//       "next_page_token": "eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaGF0IGFyZSB0aGUgZmFtb3VzIGNhc2VzIG9mIFZpa2FzIFNpbmdoPyIsImxrIjoiR2hoMmFXdGhjeUJ6YVc1bmFDQm1ZVzF2ZFhNZ1kyRnpaWE0iLCJicyI6ImMtUHk0dElNejBnc1VVZ3NTbFVveVVoVlNFdk16Uzh0VmtoT0xFNHRWc2hQVXdqTHpFNHNWZ2pPekV2UHNKZFlxbTBrSlNWUkJoWXFCZ21oS09keTRaSURtNVZaakt4TklUc3Z2enhQSVMyX3lGN2lZYktSdkpSc09WUVJza0Z3UlZ3MlhGTGhHZm5vaGdRbFpoV1VsdGhMM0ZVd2twYVNMSWNvUURhZ0NLeUF5NWxMRmVZR2tIZFNVMHFURTBzeThfTXdfSEl0M2toY1NoVFpCTGhhQVVZQSIsImlkIjoiZmNfLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVFfMiJ9",
//       "serpapi_link": "https://serpapi.com/search.json?device=desktop&engine=google_related_questions&google_domain=google.com&next_page_token=eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaGF0IGFyZSB0aGUgZmFtb3VzIGNhc2VzIG9mIFZpa2FzIFNpbmdoPyIsImxrIjoiR2hoMmFXdGhjeUJ6YVc1bmFDQm1ZVzF2ZFhNZ1kyRnpaWE0iLCJicyI6ImMtUHk0dElNejBnc1VVZ3NTbFVveVVoVlNFdk16Uzh0VmtoT0xFNHRWc2hQVXdqTHpFNHNWZ2pPekV2UHNKZFlxbTBrSlNWUkJoWXFCZ21oS09keTRaSURtNVZaakt4TklUc3Z2enhQSVMyX3lGN2lZYktSdkpSc09WUVJza0Z3UlZ3MlhGTGhHZm5vaGdRbFpoV1VsdGhMM0ZVd2twYVNMSWNvUURhZ0NLeUF5NWxMRmVZR2tIZFNVMHFURTBzeThfTXdfSEl0M2toY1NoVFpCTGhhQVVZQSIsImlkIjoiZmNfLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVFfMiJ9"
//     },
//     {
//       "question": "What is Vikas Singh known for?",
//       "type": "featured_snippet",
//       "snippet": "Vikas Singh is a distinguished economist, renowned consultant, and tenacious researcher. As an accomplished author and mentor, he has left an indelible mark on the fields of academia, consulting, and research. He has been at the forefront of shaping minds and inspiring leaders.",
//       "title": "Dr Vikas Singh - IIPA : Indian Institute of Public Administration",
//       "link": "https://www.iipa.org.in/cms/public/management/88#:~:text=Vikas%20Singh%20is%20a%20distinguished,shaping%20minds%20and%20inspiring%20leaders.",
//       "displayed_link": "https://www.iipa.org.in › cms › public › management",
//       "source_logo": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/V1JcHTx-4v7FvsC_Cdpti5wrRKwK6rZO9qqqS5M4W-4.png",
//       "next_page_token": "eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaGF0IGlzIFZpa2FzIFNpbmdoIGtub3duIGZvcj8iLCJsayI6IkdoMTNhR0YwSUdseklIWnBhMkZ6SUhOcGJtZG9JR3R1YjNkdUlHWnZjZyIsImJzIjoiYy1QeTR0SU16MGdzVVVnc1NsVW95VWhWU0V2TXpTOHRWa2hPTEU0dFZzaFBVd2pMekU0c1Znak96RXZQc0pkWXFtMGtKU1ZSQmhZcUJnbWhLT2R5NFpJRG01VlpqS3hOSVRzdnZ6eFBJUzJfeUY3aVliS1J2SlJzT1ZRUnNrRndSVncyWEZMaEdmbm9oZ1FsWmhXVWx0aEwzRlV3a3BhU0xJY29RRGFnQ0t5QXk1bExGZVlHa0hkU1UwcVRFMHN5OF9Nd19ISXQza2hjU2hUWkJMaGFBVVlBIiwiaWQiOiJmY18tTE9TYWRMbkxNQ2lwdFFQOExhNnFRUV8yIn0=",
//       "serpapi_link": "https://serpapi.com/search.json?device=desktop&engine=google_related_questions&google_domain=google.com&next_page_token=eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaGF0IGlzIFZpa2FzIFNpbmdoIGtub3duIGZvcj8iLCJsayI6IkdoMTNhR0YwSUdseklIWnBhMkZ6SUhOcGJtZG9JR3R1YjNkdUlHWnZjZyIsImJzIjoiYy1QeTR0SU16MGdzVVVnc1NsVW95VWhWU0V2TXpTOHRWa2hPTEU0dFZzaFBVd2pMekU0c1Znak96RXZQc0pkWXFtMGtKU1ZSQmhZcUJnbWhLT2R5NFpJRG01VlpqS3hOSVRzdnZ6eFBJUzJfeUY3aVliS1J2SlJzT1ZRUnNrRndSVncyWEZMaEdmbm9oZ1FsWmhXVWx0aEwzRlV3a3BhU0xJY29RRGFnQ0t5QXk1bExGZVlHa0hkU1UwcVRFMHN5OF9Nd19ISXQza2hjU2hUWkJMaGFBVVlBIiwiaWQiOiJmY18tTE9TYWRMbkxNQ2lwdFFQOExhNnFRUV8yIn0%3D"
//     },
//     {
//       "question": "Who is Vikas Singh Rajput?",
//       "type": "featured_snippet",
//       "snippet": "Vikas Singh Rajput is an Indian film, television, web series and stage actor known for UP-65, mere sai, Punyashlok Ahilyabai and bhakt maal gatha. An acting graduate of MP School of Drama Vikas made his TV debut in 2022 by playing the lead role (mahesh) in Sony TV's Mere Sai in a four months track.",
//       "title": "Vikas Singh Rajpoot - IMDb",
//       "link": "https://www.imdb.com/name/nm14591095/#:~:text=Vikas%20Singh%20Rajput%20is%20an,in%20a%20four%20months%20track.",
//       "displayed_link": "https://www.imdb.com › name",
//       "source_logo": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/V1JcHTx-4v7FvsC_Cdpti5d8FdWj4lWEI2c-WvEPgt8.png",
//       "next_page_token": "eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaG8gaXMgVmlrYXMgU2luZ2ggUmFqcHV0PyIsImxrIjoiR2hsM2FHOGdhWE1nZG1scllYTWdjMmx1WjJnZ2NtRnFjSFYwIiwiYnMiOiJjLVB5NHRJTXowZ3NVVWdzU2xVb3lVaFZTRXZNelM4dFZraE9MRTR0VnNoUFV3akx6RTRzVmdqT3pFdlBzSmRZcW0wa0pTVlJCaFlxQmdtaEtPZHk0WklEbTVWWmpLeE5JVHN2dnp4UElTMl95RjdpWWJLUnZKUnNPVlFSc2tGd1JWdzJYRkxoR2Zub2hnUWxaaFdVbHRoTDNGVXdrcGFTTEljb1FEYWdDS3lBeTVsTEZlWUdrSGRTVTBxVEUwc3k4X013X0hJdDNraGNTaFRaQkxoYUFVWUEiLCJpZCI6ImZjXy1MT1NhZExuTE1DaXB0UVA4TGE2cVFRXzIifQ==",
//       "serpapi_link": "https://serpapi.com/search.json?device=desktop&engine=google_related_questions&google_domain=google.com&next_page_token=eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaG8gaXMgVmlrYXMgU2luZ2ggUmFqcHV0PyIsImxrIjoiR2hsM2FHOGdhWE1nZG1scllYTWdjMmx1WjJnZ2NtRnFjSFYwIiwiYnMiOiJjLVB5NHRJTXowZ3NVVWdzU2xVb3lVaFZTRXZNelM4dFZraE9MRTR0VnNoUFV3akx6RTRzVmdqT3pFdlBzSmRZcW0wa0pTVlJCaFlxQmdtaEtPZHk0WklEbTVWWmpLeE5JVHN2dnp4UElTMl95RjdpWWJLUnZKUnNPVlFSc2tGd1JWdzJYRkxoR2Zub2hnUWxaaFdVbHRoTDNGVXdrcGFTTEljb1FEYWdDS3lBeTVsTEZlWUdrSGRTVTBxVEUwc3k4X013X0hJdDNraGNTaFRaQkxoYUFVWUEiLCJpZCI6ImZjXy1MT1NhZExuTE1DaXB0UVA4TGE2cVFRXzIifQ%3D%3D"
//     },
//     {
//       "question": "What is the education of Vikas Singh?",
//       "type": "featured_snippet",
//       "snippet": "He has a PhD in Hospitality from GD Goenka University. He has completed his Masters in Hotel Management, MBA (HRM) and has Studied fellowship in Southern American Cuisine at Chef John Folse Culinary Institute, Thibodaux, New Orleans. He also did a reality cookery show named \"Seedhe Rasoi Se\".",
//       "title": "Prof. (Dr.) Vikas Singh - Noida - Galgotias University",
//       "link": "https://www.galgotiasuniversity.edu.in/p/dr-vikas-singh#:~:text=He%20has%20a%20PhD%20in,named%20%22Seedhe%20Rasoi%20Se%22.",
//       "displayed_link": "https://www.galgotiasuniversity.edu.in › dr-vikas-singh",
//       "source_logo": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/V1JcHTx-4v7FvsC_Cdpti7TnZDiI0ejhjhlACXQxZ6A.png",
//       "next_page_token": "eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSBlZHVjYXRpb24gb2YgVmlrYXMgU2luZ2g/IiwibGsiOiJHaFYyYVd0aGN5QnphVzVuYUNCbFpIVmpZWFJwYjI0IiwiYnMiOiJjLVB5NHRJTXowZ3NVVWdzU2xVb3lVaFZTRXZNelM4dFZraE9MRTR0VnNoUFV3akx6RTRzVmdqT3pFdlBzSmRZcW0wa0pTVlJCaFlxQmdtaEtPZHk0WklEbTVWWmpLeE5JVHN2dnp4UElTMl95RjdpWWJLUnZKUnNPVlFSc2tGd1JWdzJYRkxoR2Zub2hnUWxaaFdVbHRoTDNGVXdrcGFTTEljb1FEYWdDS3lBeTVsTEZlWUdrSGRTVTBxVEUwc3k4X013X0hJdDNraGNTaFRaQkxoYUFVWUEiLCJpZCI6ImZjXy1MT1NhZExuTE1DaXB0UVA4TGE2cVFRXzIifQ==",
//       "serpapi_link": "https://serpapi.com/search.json?device=desktop&engine=google_related_questions&google_domain=google.com&next_page_token=eyJvbnMiOiIxMDA0MSIsImZjIjoiRXFFQkNtSkJUVzR6TFhsUlMyMW5kRTVWV0c1dVNsSm5ZVzUwWW00NFZYSm9OMWgyYzBSNVVEQklSMUp5TVZvekxWVTNVM2cwVkY5YVEwRkhkRjlxZFU4NFNTMTFSVE4yU21GT1JFaFRTR2R0TW1NMlZYZHdMWFJtVFU5emFWSnFjMWxCY2xCTGR4SVhMVXhQVTJGa1RHNU1UVU5wY0hSUlVEaE1ZVFp4VVZFYUlrRktTMHhHYlV0eFNrUllObkJ6UzJkbmNrNVhRa3hxWjJSZlpuTXhVRzV6VG1jIiwiZmN2IjoiMyIsImVpIjoiLUxPU2FkTG5MTUNpcHRRUDhMYTZxUVEiLCJxYyI6IkNpcG9kSFJ3Y3lCM2QzY2diR2x1YTJWa2FXNGdZMjl0SUdsdUlIWnBhMkZ6SUhOcGJtZG9JR0p5YVd3UUFIMkRSaVFfIiwicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSBlZHVjYXRpb24gb2YgVmlrYXMgU2luZ2g%2FIiwibGsiOiJHaFYyYVd0aGN5QnphVzVuYUNCbFpIVmpZWFJwYjI0IiwiYnMiOiJjLVB5NHRJTXowZ3NVVWdzU2xVb3lVaFZTRXZNelM4dFZraE9MRTR0VnNoUFV3akx6RTRzVmdqT3pFdlBzSmRZcW0wa0pTVlJCaFlxQmdtaEtPZHk0WklEbTVWWmpLeE5JVHN2dnp4UElTMl95RjdpWWJLUnZKUnNPVlFSc2tGd1JWdzJYRkxoR2Zub2hnUWxaaFdVbHRoTDNGVXdrcGFTTEljb1FEYWdDS3lBeTVsTEZlWUdrSGRTVTBxVEUwc3k4X013X0hJdDNraGNTaFRaQkxoYUFVWUEiLCJpZCI6ImZjXy1MT1NhZExuTE1DaXB0UVA4TGE2cVFRXzIifQ%3D%3D"
//     }
//   ],
//   "organic_results": [
//     {
//       "position": 1,
//       "title": "Vikas Singh - Founder | AI Product Builder",
//       "link": "https://ae.linkedin.com/in/vikas-singh-bril",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://ae.linkedin.com/in/vikas-singh-bril&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECCQQAQ",
//       "displayed_link": "8.2K+ followers",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppmFSSM83wu-IYMqX4uF5pVA.png",
//       "snippet": "Vikas Singh. Founder | AI Product Builder | Shipped 80+ Agents/Apps that generated more than $40Mn in revenue for Clients. Brilworks Software ...",
//       "snippet_highlighted_words": [
//         "Shipped 80+ Agents/Apps"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Vikas Singh. Founder | AI Product Builder | Shipped 80+ Agents/Apps that generated more than $40Mn in revenue for Clients. Brilworks Software ...",
//           "source_info_link": "https://ae.linkedin.com/in/vikas-singh-bril",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppk8Y4kZKYjWMYR9ukI3iftx5of1UsrzjKJJv9nr37PnF.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://ae.linkedin.com/in/vikas-singh-bril&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fae.linkedin.com%2Fin%2Fvikas-singh-bril",
//       "source": "LinkedIn · Vikas Singh"
//     },
//     {
//       "position": 2,
//       "title": "12600+ \"Vikas Singh\" profiles",
//       "link": "https://www.linkedin.com/pub/dir/Vikas/Singh",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.linkedin.com/pub/dir/Vikas/Singh&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECB0QAQ",
//       "displayed_link": "https://www.linkedin.com › pub › dir › Vikas › Singh",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpphQ_a03K06QyexqH6tDCp4A.png",
//       "snippet": "Brilworks Software, +5 more. Gujarat University, +2 more. Vikas Singh. General Manager | Strategy and New Businesses | P&L Leader | Growth ...",
//       "snippet_highlighted_words": [
//         "Brilworks Software"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Brilworks Software, +5 more. Gujarat University, +2 more. Vikas Singh. General Manager | Strategy and New Businesses | P&L Leader | Growth ...",
//           "source_info_link": "https://www.linkedin.com/pub/dir/Vikas/Singh",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppmCkFq-VkTQaTOH1xBy1BWVD4MMcT23jfNB2xwLa09yP.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://www.linkedin.com/pub/dir/Vikas/Singh&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fwww.linkedin.com%2Fpub%2Fdir%2FVikas%2FSingh",
//       "source": "LinkedIn"
//     },
//     {
//       "position": 3,
//       "title": "Brilworks Software",
//       "link": "https://in.linkedin.com/company/brilworks",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://in.linkedin.com/company/brilworks&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECCUQAQ",
//       "displayed_link": "32.9K+ followers",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppj-qjepeTYefoiUsQASDw2Y.png",
//       "snippet": "Click here to view Vikas Singh's profile. Vikas Singh. Founder | AI Product Builder | Shipped… Click here to view Suhas Deshmukh's profile. Suhas Deshmukh.",
//       "snippet_highlighted_words": [
//         "Vikas Singh"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Click here to view Vikas Singh's profile. Vikas Singh. Founder | AI Product Builder | Shipped… Click here to view Suhas Deshmukh's profile. Suhas Deshmukh.",
//           "source_info_link": "https://in.linkedin.com/company/brilworks",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpphfyTNWLQlDluAY_5ETQwjw3RmFstTjGqKQpNX70tSLx.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://in.linkedin.com/company/brilworks&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fin.linkedin.com%2Fcompany%2Fbrilworks",
//       "source": "LinkedIn · Brilworks Software"
//     },
//     {
//       "position": 4,
//       "title": "Vikas Singh - Whatfix",
//       "link": "https://in.linkedin.com/in/vikas-singh-17459052",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://in.linkedin.com/in/vikas-singh-17459052&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECB4QAQ",
//       "displayed_link": "1.4K+ followers",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppuICN7F0CaxcbMxFXdDk6Ec.png",
//       "snippet": "Results-driven Delivery Manager Dedicated and accomplished Project Manager with a… · Experience: Whatfix · Education: Mumbai University · Location: Mumbai ...",
//       "snippet_highlighted_words": [
//         "Results-driven Delivery Manager"
//       ],
//       "rich_snippet": {
//         "top": {
//           "extensions": [
//             "Mumbai, Maharashtra, India",
//             "Whatfix"
//           ]
//         }
//       },
//       "about_this_result": {
//         "source": {
//           "description": "Results-driven Delivery Manager Dedicated and accomplished Project Manager with a… · Experience: Whatfix · Education: Mumbai University · Location: Mumbai ...",
//           "source_info_link": "https://in.linkedin.com/in/vikas-singh-17459052",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpphhYG_Dtodjn-ocsDB8I1JN4iyWupSq8qzbr6SVsmnqN.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://in.linkedin.com/in/vikas-singh-17459052&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fin.linkedin.com%2Fin%2Fvikas-singh-17459052",
//       "source": "LinkedIn · Vikas Singh"
//     },
//     {
//       "position": 5,
//       "title": "Vikas Singh",
//       "link": "https://www.brilworks.com/blog/author/vikas-singh/",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.brilworks.com/blog/author/vikas-singh/&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECBwQAQ",
//       "displayed_link": "https://www.brilworks.com › blog › author › vikas-singh",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppg-bUqSdVwsMlXENk9Nnh6E.png",
//       "snippet": "Vikas is the Chief Technology Officer (CTO) at Brilworks, leads the company's tech innovations with extensive experience in software development. He drives the ...",
//       "snippet_highlighted_words": [
//         "Chief Technology Officer (CTO) at Brilworks"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Vikas is the Chief Technology Officer (CTO) at Brilworks, leads the company's tech innovations with extensive experience in software development. He drives the ...",
//           "source_info_link": "https://www.brilworks.com/blog/author/vikas-singh/",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppsRVJtDFUPIA4lqu7Es3b-QHg8YTTd32mu4u8EXf1zwz.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://www.brilworks.com/blog/author/vikas-singh/&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fwww.brilworks.com%2Fblog%2Fauthor%2Fvikas-singh%2F",
//       "source": "Brilworks"
//     },
//     {
//       "position": 6,
//       "title": "Vikas Singh - Consulting LEA's for technology in ...",
//       "link": "https://in.linkedin.com/in/vikas-singh-b370746",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://in.linkedin.com/in/vikas-singh-b370746&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECB8QAQ",
//       "displayed_link": "2.9K+ followers",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpptH3fqsjGjqXYusWJJuZANc.png",
//       "snippet": "Consulting LEA's for technology in investigations ! · A thought leader and business development and sales professional with over 25 years of extensive ...",
//       "snippet_highlighted_words": [
//         "Consulting LEA's for technology in investigations"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Consulting LEA's for technology in investigations ! · A thought leader and business development and sales professional with over 25 years of extensive ...",
//           "source_info_link": "https://in.linkedin.com/in/vikas-singh-b370746",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppqwoB5j81x3dxmVj2hz6urqu4m3xMrObcwDMIXpue_YI.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://in.linkedin.com/in/vikas-singh-b370746&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fin.linkedin.com%2Fin%2Fvikas-singh-b370746",
//       "source": "LinkedIn · Vikas Singh"
//     },
//     {
//       "position": 7,
//       "title": "Vikas Singh's Post",
//       "link": "https://www.linkedin.com/posts/vikas-singh-giftdminds_entrepreneurs-entrepreneur-startupindia-activity-7018795274504478720-3f5_",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.linkedin.com/posts/vikas-singh-giftdminds_entrepreneurs-entrepreneur-startupindia-activity-7018795274504478720-3f5_&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECBsQAQ",
//       "displayed_link": "https://www.linkedin.com › posts",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppkBR4aW7oK-vicazpGYLOHU.png",
//       "snippet": "Skip to main content LinkedIn · Join now Sign in. Vikas Singh's Post. View profile for Vikas Singh · Vikas Singh. Polymath | Founder, GiftdMinds. 2y. Report ...",
//       "snippet_highlighted_words": [
//         "View profile for Vikas Singh"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Skip to main content LinkedIn · Join now Sign in. Vikas Singh's Post. View profile for Vikas Singh · Vikas Singh. Polymath | Founder, GiftdMinds. 2y. Report ...",
//           "source_info_link": "https://www.linkedin.com/posts/vikas-singh-giftdminds_entrepreneurs-entrepreneur-startupindia-activity-7018795274504478720-3f5_",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppsdza660PQyR0bHu8AEgBkUKBnQQ5LCyhtTO7LIZS2r5.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://www.linkedin.com/posts/vikas-singh-giftdminds_entrepreneurs-entrepreneur-startupindia-activity-7018795274504478720-3f5_&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fwww.linkedin.com%2Fposts%2Fvikas-singh-giftdminds_entrepreneurs-entrepreneur-startupindia-activity-7018795274504478720-3f5_",
//       "source": "LinkedIn"
//     },
//     {
//       "position": 8,
//       "title": "Brilworks Software CEO - Hitesh Umaletiya and CTO",
//       "link": "https://www.facebook.com/brilwork/posts/brilworks-software-ceo-hitesh-umaletiya-and-cto-vikas-singh-illuminated-the-path/464813999545696/",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.facebook.com/brilwork/posts/brilworks-software-ceo-hitesh-umaletiya-and-cto-vikas-singh-illuminated-the-path/464813999545696/&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECD0QAQ",
//       "displayed_link": "4 reactions · 1 year ago",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppk3S3aw6XtQXEf4sNN_WM9o.png",
//       "snippet": "Brilworks Software CEO - Hitesh Umaletiya and CTO - Vikas Singh illuminated the path ahead with Brilworks' vision and mission.",
//       "snippet_highlighted_words": [
//         "CTO - Vikas Singh"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Brilworks Software CEO - Hitesh Umaletiya and CTO - Vikas Singh illuminated the path ahead with Brilworks' vision and mission.",
//           "source_info_link": "https://www.facebook.com/brilwork/posts/brilworks-software-ceo-hitesh-umaletiya-and-cto-vikas-singh-illuminated-the-path/464813999545696/",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpptjBo5OrjKtlXzOylShaIMH5Fay6nNXZI8pazzkUg0Ro.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://www.facebook.com/brilwork/posts/brilworks-software-ceo-hitesh-umaletiya-and-cto-vikas-singh-illuminated-the-path/464813999545696/&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fwww.facebook.com%2Fbrilwork%2Fposts%2Fbrilworks-software-ceo-hitesh-umaletiya-and-cto-vikas-singh-illuminated-the-path%2F464813999545696%2F",
//       "source": "Facebook · Brilworks Software"
//     },
//     {
//       "position": 9,
//       "title": "𝐁𝐞𝐬𝐭 𝐏𝐫𝐚𝐜𝐭𝐢𝐜𝐞𝐬 𝐟𝐨𝐫 𝐁𝐮𝐢𝐥𝐝𝐢𝐧𝐠 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐢𝐯𝐞 ...",
//       "link": "https://medium.com/@vik.bril/-ca3d1fa5ffc5",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://medium.com/%40vik.bril/-ca3d1fa5ffc5&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECDgQAQ",
//       "displayed_link": "1 year ago",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpptsM_d2hyX_u4KVBgDswIkM.png",
//       "snippet": "Written by Vikas Singh ... I thrive on driving transformation. I'm passionate about harnessing technology's potential for tangible business growth ...",
//       "snippet_highlighted_words": [
//         "Vikas Singh"
//       ],
//       "about_this_result": {
//         "source": {
//           "description": "Written by Vikas Singh ... I thrive on driving transformation. I'm passionate about harnessing technology's potential for tangible business growth ...",
//           "source_info_link": "https://medium.com/@vik.bril/-ca3d1fa5ffc5",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppreKrtV-OkCmhh7zDwQUSO5l-huXyzmLVR6BiIGoyTbd.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://medium.com/@vik.bril/-ca3d1fa5ffc5&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fmedium.com%2F%40vik.bril%2F-ca3d1fa5ffc5",
//       "source": "Medium · Vikas Singh"
//     },
//     {
//       "position": 10,
//       "title": "Vikas Singh - Brilltech Engineers Pvt Ltd",
//       "link": "https://in.linkedin.com/in/vikas-singh-41775221b",
//       "redirect_link": "https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://in.linkedin.com/in/vikas-singh-41775221b&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQFnoECDcQAQ",
//       "displayed_link": "2 followers",
//       "favicon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqpppMBuSjawHNcYHz_wGC7k3o.png",
//       "snippet": "Experience: Brilltech Engineers Pvt Ltd · Location: 110001 · 2 connections on LinkedIn. View Vikas Singh's profile on LinkedIn, a professional community of 1",
//       "snippet_highlighted_words": [
//         "LinkedIn",
//         "Vikas Singh's",
//         "LinkedIn"
//       ],
//       "rich_snippet": {
//         "top": {
//           "extensions": [
//             "Delhi, India",
//             "Brilltech Engineers Pvt Ltd"
//           ]
//         }
//       },
//       "about_this_result": {
//         "source": {
//           "description": "Experience: Brilltech Engineers Pvt Ltd · Location: 110001 · 2 connections on LinkedIn. View Vikas Singh's profile on LinkedIn, a professional community of 1",
//           "source_info_link": "https://in.linkedin.com/in/vikas-singh-41775221b",
//           "icon": "https://serpapi.com/searches/6992b3f895a69475241656f1/images/lDxyDGhvofUf2uO1bIqppiuiV6wfZK4DoDdcMvqkI1RWYFcOL0roP4T5yOq9rtgG.png"
//         },
//         "languages": [
//           "en"
//         ],
//         "regions": [
//           "IN"
//         ]
//       },
//       "about_page_link": "https://www.google.com/search?q=About+https://in.linkedin.com/in/vikas-singh-41775221b&tbm=ilp",
//       "about_page_serpapi_link": "https://serpapi.com/search.json?engine=google_about_this_result&google_domain=google.com&q=About+https%3A%2F%2Fin.linkedin.com%2Fin%2Fvikas-singh-41775221b",
//       "missing": [
//         "bril/"
//       ],
//       "must_include": {
//         "word": "bril/",
//         "link": "https://www.google.com/search?sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&q=https://www.linkedin.com/in/vikas-singh-+%22bril/%22&sa=X&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ5t4CegQIQhAB"
//       },
//       "source": "LinkedIn · Vikas Singh"
//     }
//   ],
//   "pagination": {
//     "current": 1,
//     "next": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=10&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8NMDegQICxAW",
//     "other_pages": {
//       "2": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=10&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAE",
//       "3": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=20&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAG",
//       "4": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=30&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAI",
//       "5": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=40&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAK",
//       "6": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=50&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAM",
//       "7": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=60&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAO",
//       "8": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=70&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAQ",
//       "9": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=80&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAS",
//       "10": "https://www.google.com/search?q=https://www.linkedin.com/in/vikas-singh-bril/&sca_esv=6a3dc1d72e9664c9&gl=in&hl=en&ei=-LOSadLnLMCiptQP8La6qQQ&start=90&sa=N&sstk=Af77f_d0a572RH72KtbDwVmP5x1lcB4miVe-O68DYOn_5dodxklHgmPGlGl1yscSYVa6pN1A7dTRiCc-gdPyxFNHBTBvACe66qR8UQ&ved=2ahUKEwjSw5iVrN2SAxVAkYkEHXCbLkUQ8tMDegQICxAU"
//     }
//   },
//   "serpapi_pagination": {
//     "current": 1,
//     "next_link": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=10",
//     "next": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=10",
//     "other_pages": {
//       "2": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=10",
//       "3": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=20",
//       "4": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=30",
//       "5": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=40",
//       "6": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=50",
//       "7": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=60",
//       "8": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=70",
//       "9": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=80",
//       "10": "https://serpapi.com/search.json?device=desktop&engine=google&gl=in&google_domain=google.com&hl=en&q=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikas-singh-bril%2F&start=90"
//     }
//   }
// }

    // console.log("Search Results for 'OpenAI GPT':\n", JSON.stringify(data));

    console.log("Top 5 Results:\n");
    const result = {
      name : "",
      linkedInUrl : url,
      note: ""
    };
console.log("------",result);

    if (data.organic_results) {
      result.name = (data.organic_results[0].title || "").split(" - ")[0] || "";
      result.linkedInUrl = data.organic_results[0].link || "";
      result.note = ((data.organic_results[0].title || "").split(" - ")[1] || "").trim();
    }
    // console.log(`result: ${JSON.stringify(result)}`);
    
      return result;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}



export { fetchResults };