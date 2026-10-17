const str=`<a class="item" href="https://anikoto.cz/watch/road-of-naruto-ggjw8">\n    <div class="poster">\n      <span\n        ><img\n          src="https://cdn.anipixcdn.co/thumbnail/abfd676ad3a01f1e8860fecff9f5b8e0.jpg"\n      /></span>\n    </div>\n    <div class="info">\n      <div class="name d-title" data-jp="Road of Naruto">Road of Naruto</div>`;
const regex = /<a[^>]*href="([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?class="name[^>]*>([^<]+)/gi;
console.log(regex.exec(str));
