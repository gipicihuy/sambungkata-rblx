;(async function(){
  const _KP=["K!b9#mX2","zQ7@nL5$","vR3^wY8&","tU6*oP4~"]
  const _KS=[2,0,3,1]
  const _SALT=new Uint8Array([0xfa,0x3c,0x91,0xb7,0x2e,0x55,0xd0,0x18,0xac,0x77,0x4f,0xe2,0x09,0x6b,0xc3,0x38])

  async function buildKey(){
    const enc=new TextEncoder().encode(_KS.map(i=>_KP[i]).join(''))
    const base=await crypto.subtle.importKey('raw',enc,'PBKDF2',false,['deriveBits'])
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:_SALT,iterations:200000,hash:'SHA-256'},base,256)
    return new Uint8Array(bits)
  }

  function MT19937(seed){
    const mt=new Uint32Array(624)
    let idx=624
    mt[0]=seed>>>0
    for(let i=1;i<624;i++) mt[i]=(Math.imul(1812433253,mt[i-1]^(mt[i-1]>>>30))+i)>>>0
    function generate(){
      for(let i=0;i<624;i++){
        const y=(mt[i]&0x80000000)|((mt[(i+1)%624])&0x7fffffff)
        mt[i]=mt[(i+397)%624]^(y>>>1)
        if(y&1)mt[i]^=0x9908b0df
      }
      idx=0
    }
    function next(){
      if(idx>=624)generate()
      let y=mt[idx++]
      y^=y>>>11;y^=(y<<7)&0x9d2c5680;y^=(y<<15)&0xefc60000;y^=y>>>18
      return y>>>0
    }
    function randint256(){return next()>>>24}
    function shuffle(n){
      const arr=new Int32Array(n)
      for(let i=0;i<n;i++)arr[i]=i
      for(let i=n-1;i>0;i--){
        let r,bits=Math.ceil(Math.log2(i+2)),mask=(1<<bits)-1
        do{r=next()&mask}while(r>i)
        const tmp=arr[i];arr[i]=arr[r];arr[r]=tmp
      }
      return arr
    }
    return{randint256,shuffle,next}
  }

  function stripNoise(data,key){
    const seed=Number(((BigInt(key[8])<<56n)|(BigInt(key[9])<<48n)|(BigInt(key[10])<<40n)|(BigInt(key[11])<<32n)|(BigInt(key[12])<<24n)|(BigInt(key[13])<<16n)|(BigInt(key[14])<<8n)|BigInt(key[15]))&0xFFFFFFFFn)
    const rng=MT19937(seed),out=[],interval=17
    let ri=0
    for(let i=0;i<data.length;i++){
      ri++
      if(ri%interval===0){rng.randint256()}
      else{out.push(data[i])}
    }
    return new Uint8Array(out)
  }

  function b85decode(data){
    const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~'
    const map=new Uint8Array(256).fill(255)
    for(let i=0;i<chars.length;i++)map[chars.charCodeAt(i)]=i
    const out=[];let acc=0,cnt=0
    for(let i=0;i<data.length;i++){
      const v=map[data[i]];if(v===255)continue
      acc=acc*85+v;cnt++
      if(cnt===5){out.push((acc>>>24)&0xff,(acc>>>16)&0xff,(acc>>>8)&0xff,acc&0xff);acc=0;cnt=0}
    }
    if(cnt>0){
      for(let i=cnt;i<5;i++)acc=acc*85+84
      const b=[(acc>>>24)&0xff,(acc>>>16)&0xff,(acc>>>8)&0xff,acc&0xff]
      out.push(...b.slice(0,cnt-1))
    }
    return new Uint8Array(out)
  }

  function unshuffle(data,key){
    const seed=Number(((BigInt(key[0])<<56n)|(BigInt(key[1])<<48n)|(BigInt(key[2])<<40n)|(BigInt(key[3])<<32n)|(BigInt(key[4])<<24n)|(BigInt(key[5])<<16n)|(BigInt(key[6])<<8n)|BigInt(key[7]))&0xFFFFFFFFn)
    const rng=MT19937(seed),indices=rng.shuffle(data.length),out=new Uint8Array(data.length)
    for(let i=0;i<data.length;i++)out[indices[i]]=data[i]
    return out
  }

  function unxorRoll(data,key){
    const out=new Uint8Array(data.length),klen=key.length;let prev=0xAB
    for(let i=0;i<data.length;i++){
      const k=key[i%klen]^prev;out[i]=data[i]^k;prev=data[i]
    }
    return out
  }

  async function aesDecrypt(data,key){
    const iv=data.slice(0,16),ct=data.slice(16)
    const ck=await crypto.subtle.importKey('raw',key,{name:'AES-CBC'},false,['decrypt'])
    return new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv},ck,ct))
  }

  async function decompress(data){
    const ds=new DecompressionStream('deflate'),w=ds.writable.getWriter(),r=ds.readable.getReader()
    w.write(data);w.close()
    const chunks=[];while(true){const{done,value}=await r.read();if(done)break;chunks.push(value)}
    const out=new Uint8Array(chunks.reduce((s,c)=>s+c.length,0));let off=0
    for(const c of chunks){out.set(c,off);off+=c.length}
    return out
  }

  function parseHeader(buf){
    const magic=new Uint8Array(buf,0,4),MAGIC=[0x4B,0xBB,0x10,0x25]
    for(let i=0;i<4;i++)if(magic[i]!==MAGIC[i])throw new Error('invalid magic')
    return new Uint8Array(buf,24)
  }

  async function findBinFile(){
    try{
      const r=await fetch('kbbi.map')
      if(r.ok)return(await r.text()).trim()
    }catch(e){}
    return 'kbbi.bin'
  }

  try{
    const filename=await findBinFile()
    const resp=await fetch(filename)
    if(!resp.ok)throw new Error('fetch failed: '+filename)
    const buf=await resp.arrayBuffer()
    const key=await buildKey()
    let d=parseHeader(buf)
    d=stripNoise(d,key)
    d=b85decode(d)
    d=unshuffle(d,key)
    d=unxorRoll(d,key)
    d=await aesDecrypt(d,key)
    d=await decompress(d)
    window.__KBBI__=JSON.parse(new TextDecoder().decode(d))
  }catch(err){
    console.error('[kbbi_enc] gagal decode:',err)
    window.__KBBI__=null
  }
})()