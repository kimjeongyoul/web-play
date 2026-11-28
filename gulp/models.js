// Baked from Kenney CC0 kits by gamedev-kit/web/tools/bake_models.py, packed by tools/models_bin.py. Do not edit by hand.
// The numbers live in models.bin.gz (models.bin where the browser cannot unzip); here only where each one starts.
const META = {"cottage_a":{"q":0.0001043733024079104,"p":[0,11724],"c":[11724,5862],"i":[17586,7044],"h":3.42},"cottage_b":{"q":0.00010986663411358989,"p":[24630,12288],"c":[36918,6144],"i":[43062,7176],"h":3.6},"cottage_c":{"q":9.622486037781915e-05,"p":[50238,7782],"c":[58020,3891],"i":[61911,4620],"h":3.15},"house_a":{"q":0.00014825891903439434,"p":[66531,17184],"c":[83715,8592],"i":[92307,10488],"h":4.86},"house_b":{"q":0.00017090365306558428,"p":[102795,16992],"c":[119787,8496],"i":[128283,10386],"h":5.6},"house_c":{"q":0.00017090365306558428,"p":[138669,9984],"c":[148653,4992],"i":[153645,6144],"h":5.6},"house_d":{"q":0.00016245002594073306,"p":[159789,11592],"c":[171381,5796],"i":[177177,7692],"h":5.32},"shop_a":{"q":0.00023981444746238592,"p":[184869,14592],"c":[199461,7296],"i":[206757,7512],"h":7.86},"shop_b":{"q":0.00019837031159398175,"p":[214269,14232],"c":[228501,7116],"i":[235617,7170],"h":6.5},"shop_c":{"q":0.000304788354136784,"p":[242787,20556],"c":[263343,10278],"i":[273621,10764],"h":9.99},"tower_a":{"q":0.0006966460158085879,"p":[284385,19008],"c":[303393,9504],"i":[312897,9552],"h":22.83},"tower_b":{"q":0.0006463209936826685,"p":[322449,19626],"c":[342075,9813],"i":[351888,10224],"h":21.18},"sky_a":{"q":0.0008774071474349193,"p":[362112,15336],"c":[377448,7668],"i":[385116,7752],"h":28.75},"sky_b":{"q":0.001098666341135899,"p":[392868,13368],"c":[406236,6684],"i":[412920,6936],"h":36.0},"car_a":{"q":3.353984191412092e-05,"p":[419856,24354],"c":[444210,12177],"i":[456387,12192],"h":1.1},"car_b":{"q":3.653065584276864e-05,"p":[468579,23664],"c":[492243,11832],"i":[504075,12432],"h":1.2},"car_c":{"q":3.466902676473281e-05,"p":[516507,30624],"c":[547131,15312],"i":[562443,14844],"h":1.09},"car_e":{"q":3.433332316049684e-05,"p":[577287,27210],"c":[604497,13605],"i":[618102,13824],"h":0.94},"bus_k":{"q":7.315286721396526e-05,"p":[631926,29622],"c":[661548,14811],"i":[676359,14856],"h":2.4}}
const at = (f) => new URL(f, import.meta.url)
async function bytes() {
  try {
    if (typeof DecompressionStream === 'undefined') throw new Error('no gzip')
    let b = new Uint8Array(await (await fetch(at('models.bin.gz'))).arrayBuffer())
    // a server may already have unzipped it (Content-Encoding: gzip); only unzip what still starts like gzip
    if (b[0] === 0x1f && b[1] === 0x8b) b = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
    if (b.length === 691215) return b
  } catch {}
  return new Uint8Array(await (await fetch(at('models.bin'))).arrayBuffer())
}
const all = await bytes()
export const MODELS = {}
for (const [name, m] of Object.entries(META)) MODELS[name] = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Array.isArray(v) ? all.slice(v[0], v[0] + v[1]) : v]))
