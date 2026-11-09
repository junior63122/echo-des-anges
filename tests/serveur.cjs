const http=require("http"),fs=require("fs"),path=require("path"),zlib=require("zlib");const R=process.argv[2];
const T={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".avif":"image/avif",".xml":"application/xml",".txt":"text/plain",".webmanifest":"application/manifest+json"};
http.createServer((q,r)=>{let p=decodeURIComponent(new URL(q.url,"http://x").pathname);let f=path.join(R,p);
if(fs.existsSync(f)&&fs.statSync(f).isDirectory()){if(!p.endsWith("/")){r.writeHead(301,{Location:p+"/"});return r.end()}f=path.join(f,"index.html")}
let code=200;if(!fs.existsSync(f)){code=404;f=path.join(R,"404.html")}
const ext=path.extname(f),type=T[ext]||"application/octet-stream";let body=fs.readFileSync(f);const h={"Content-Type":type,"Cache-Control":"max-age=600"};
if(/text|json|javascript|svg|xml|manifest/.test(type)&&/gzip/.test(q.headers["accept-encoding"]||"")){body=zlib.gzipSync(body);h["Content-Encoding"]="gzip"}
r.writeHead(code,h);r.end(body)}).listen(+process.argv[3]);
