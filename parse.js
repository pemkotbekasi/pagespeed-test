const axios = require('axios');
const fs = require('fs');

function GetUrl(url) {
  try {
    return new URL(url||'https://rahadiana.github.io').hostname 
  } catch (e) {
    return 'rahadiana.github.io'
  }

}
axios.get('https://stat.bekasikota.go.id/status/webmonopd', { maxBodyLength: Infinity })
  .then(response => {
    const yy = response.data.split('window.preloadData =')[1].split('</script>')[0].trim();
    const uuu = yy.slice(0, -1).split(`publicGroupList':`)[1]
      .split(`maintenanceList':`)[0].slice(0, -2).replaceAll(`'`, `"`);
    const result = (JSON.parse(uuu)[0].monitorList);
    const FilesJSON = result.map(d => `lighthouse ${d.url} --output=json --output-path=./json/${GetUrl(d.url)}.json`)
    const FilesHtml = result.map(d => `lighthouse ${d.url} --output=html --output-path=./html/${GetUrl(d.url)}.html`)
    fs.writeFileSync('outputJSON.sh', FilesJSON.join('\n'));
    fs.writeFileSync('FilesHtml.sh', FilesHtml.join('\n'));
  })
  .catch(error => console.error(error));
