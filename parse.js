const axios = require('axios');
const fs = require('fs');

function GetUrl(url) {
  try {
    return new URL(url).hostname
  } catch (e) {
    return 'null'
  }

}
axios.get('https://stat.bekasikota.go.id/status/webmonopd', { maxBodyLength: Infinity })
  .then(response => {
    const yy = response.data.split('window.preloadData =')[1].split('</script>')[0].trim();
    const uuu = yy.slice(0, -1).split(`publicGroupList':`)[1]
      .split(`maintenanceList':`)[0].slice(0, -2).replaceAll(`'`, `"`);
    const result = (JSON.parse(uuu)[0].monitorList);
    const Files = result.map(d => `lighthouse ${d.url} --output=json --output-path=./${GetUrl(d.url)}.json`)
    fs.writeFileSync('output.sh', Files.join('\n'));
  })
  .catch(error => console.error(error));
