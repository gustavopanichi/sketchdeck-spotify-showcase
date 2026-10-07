import sys, re, zlib, struct, os
# Extract embedded raster images from a PDF (DCT jpeg, Flate RGB/Gray, with SMask alpha when available).
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
data = open(src,'rb').read()
objs = {}
for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj', data, re.S):
    objs[int(m.group(1))] = m.group(3)
def dictval(d, key):
    m = re.search(rb'/'+key+rb'\s*(/?\w+|\[[^\]]*\]|\d+\s+\d+\s+R|\d+)', d)
    return m.group(1) if m else None
def stream_of(body):
    m = re.search(rb'stream\r?\n', body)
    if not m: return None, None
    hdr = body[:m.start()]; s = body[m.end():]
    e = s.rfind(b'endstream'); s = s[:e]
    if s.endswith(b'\r\n'): s=s[:-2]
    elif s.endswith(b'\n') or s.endswith(b'\r'): s=s[:-1]
    return hdr, s
def resolve(v):
    m = re.match(rb'(\d+)\s+\d+\s+R', v or b'')
    return objs.get(int(m.group(1))) if m else None
def png(w,h,mode,raw,alpha=None):
    # mode 'RGB' or 'L'
    bpp = 3 if mode=='RGB' else 1
    rows=[]
    for y in range(h):
        row = raw[y*w*bpp:(y+1)*w*bpp]
        if alpha is not None:
            a = alpha[y*w:(y+1)*w]
            if mode=='RGB': row = b''.join(row[i*3:i*3+3]+a[i:i+1] for i in range(w))
            else: row = b''.join(row[i:i+1]+a[i:i+1] for i in range(w))
        rows.append(b'\0'+row)
    ct = {('RGB',False):2,('RGB',True):6,('L',False):0,('L',True):4}[(mode,alpha is not None)]
    def chunk(t,b): return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,ct,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),6))+chunk(b'IEND',b'')
def decode_flate(hdr, s):
    try: raw = zlib.decompress(s)
    except Exception: return None
    dp = re.search(rb'/DecodeParms\s*<<(.*?)>>', hdr, re.S)
    if dp and b'/Predictor' in dp.group(1):
        pred = int(re.search(rb'/Predictor\s+(\d+)', dp.group(1)).group(1))
        colors = int((re.search(rb'/Colors\s+(\d+)', dp.group(1)) or [None,b'1'])[1]); bpc=8
        cols = int(re.search(rb'/Columns\s+(\d+)', dp.group(1)).group(1))
        if pred >= 10:
            bpp = colors; stride = cols*colors; outb = bytearray(); prev = bytearray(stride); pos=0
            while pos+1+stride <= len(raw):
                ft = raw[pos]; line = bytearray(raw[pos+1:pos+1+stride]); pos += 1+stride
                for i in range(stride):
                    a = line[i-bpp] if i>=bpp else 0; b = prev[i]; c = prev[i-bpp] if i>=bpp else 0
                    if ft==1: line[i]=(line[i]+a)&255
                    elif ft==2: line[i]=(line[i]+b)&255
                    elif ft==3: line[i]=(line[i]+((a+b)>>1))&255
                    elif ft==4:
                        p=a+b-c; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c)
                        line[i]=(line[i]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
                outb += line; prev = line
            raw = bytes(outb)
    return raw
n=0
for num, body in objs.items():
    if b'/Subtype' not in body or b'/Image' not in body: continue
    hdr, s = stream_of(body)
    if s is None: continue
    w = dictval(hdr,b'Width'); h = dictval(hdr,b'Height')
    if not w or not h: continue
    w=int(w); h=int(h)
    if w*h < 40000: continue
    filt = dictval(hdr,b'Filter') or b''
    cs = dictval(hdr,b'ColorSpace') or b''
    bpc = dictval(hdr,b'BitsPerComponent')
    # alpha
    alpha=None
    sm = resolve(dictval(hdr,b'SMask'))
    if sm:
        sh, ss = stream_of(sm)
        if ss is not None and b'Flate' in (dictval(sh,b'Filter') or b''):
            a = decode_flate(sh, ss)
            if a and len(a) >= w*h: alpha = a[:w*h]
    name = f"{out}/img{num:05d}_{w}x{h}"
    if b'DCT' in filt:
        if alpha is not None:
            open(name+'.jpg','wb').write(s); open(name+'.alpha.pgm','wb').write(b'P5\n%d %d\n255\n'%(w,h)+alpha)
        else: open(name+'.jpg','wb').write(s)
        n+=1
    elif b'Flate' in filt and bpc==b'8':
        raw = decode_flate(hdr, s)
        if raw is None: continue
        if b'ICCBased' in cs or b'Indexed' in cs or cs.startswith(b'[') :
            # resolve ICC N
            ref = resolve(re.search(rb'(\d+\s+\d+\s+R)', cs).group(1)) if re.search(rb'\d+\s+\d+\s+R', cs) else None
            N = int((re.search(rb'/N\s+(\d+)', ref or b'') or [None,b'3'])[1])
            if b'Indexed' in cs: continue
            mode = 'RGB' if N==3 else 'L' if N==1 else None
        else:
            mode = 'RGB' if b'RGB' in cs else 'L' if b'Gray' in cs else None
        if mode is None: continue
        need = w*h*(3 if mode=='RGB' else 1)
        if len(raw) < need: continue
        open(name+'.png','wb').write(png(w,h,mode,raw[:need],alpha)); n+=1
print(f"{n} images -> {out}")
