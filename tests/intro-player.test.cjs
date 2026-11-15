const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const {buildSync} = require('esbuild');

// Exercise the production controller. Only the browser's media/DOM surfaces are
// represented by EventTargets, allowing playback promises to settle in any order.
const root = path.resolve(__dirname, '..');
const source = buildSync({
  entryPoints: [path.join(root, 'src3d/intro-player.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
  define: {INTRO_VIDEO_DATA: JSON.stringify('data:video/mp4;base64,fixture')}
}).outputFiles[0].text;
const modulePath = path.join(__dirname, 'intro-player-fixture.cjs');
const bundled = new Module(modulePath, module);
bundled.filename = modulePath;
bundled.paths = Module._nodeModulePaths(root);
bundled._compile(source, modulePath);
const {makeIntroPlayer, introCaption, introChapter, formatIntroTime, INTRO_CAPTIONS, INTRO_DURATION, INTRO_CHAPTERS} = bundled.exports;

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function mediaError(name) { return Object.assign(new Error(name), {name}); }

class Media extends EventTarget {
  constructor() {
    super();
    Object.assign(this, {paused: true, hidden: true, muted: false, currentTime: 0,
      readyState: 2, error: null, src: '', playCalls: 0, pauseCalls: 0, loadCalls: 0,
      responses: []});
  }
  getAttribute(name) { return name === 'src' ? this.src : null; }
  play() {
    this.playCalls++;
    const response = this.responses.shift();
    this.paused = !!response?.error;
    return response?.error ? Promise.reject(response.error) : response?.promise || Promise.resolve();
  }
  pause() { this.pauseCalls++; this.paused = true; }
  load() { this.loadCalls++; this.error = null; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
function fixture(t) {
  const video = new Media(), subtitle = {textContent: ''};
  const playButton = Object.assign(new EventTarget(), {hidden: true, textContent: ''});
  const events = {completed: 0, fallback: 0};
  const intro = makeIntroPlayer({video, subtitle, playButton,
    onComplete() { events.completed++; }, onFallback() { events.fallback++; }});
  t.after(() => intro.stop());
  return {video, subtitle, playButton, events, intro};
}

test('autoplay denial exposes a working manual play action', async t => {
  const {video, playButton, intro, events} = fixture(t);
  video.responses.push({error: mediaError('NotAllowedError')});
  intro.start(); await flush();
  assert.equal(intro.blocked, true);
  assert.equal(playButton.hidden, false);
  assert.equal(events.fallback, 0);
  playButton.dispatchEvent(new Event('click')); await flush();
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, false);
  assert.equal(playButton.hidden, true);
  assert.equal(intro.blocked, false);
});

test('an active aborted playback remains recoverable through the Play button', async t => {
  const {video, playButton, intro, events} = fixture(t);
  video.responses.push({error: mediaError('AbortError')});
  intro.start(); await flush();
  assert.equal(video.paused, true);
  assert.equal(playButton.hidden, false);
  assert.equal(intro.blocked, true);
  assert.deepEqual(events, {completed: 0, fallback: 0});
  playButton.dispatchEvent(new Event('click')); await flush();
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, false);
  assert.equal(playButton.hidden, true);
  assert.equal(intro.blocked, false);
});

test('skipping clears the film and ignores pending rejection, error and ending events', async t => {
  const {video, subtitle, playButton, intro, events} = fixture(t), pending = deferred();
  video.responses.push(pending);
  intro.start(); video.currentTime = INTRO_CAPTIONS[0][0]+.1; intro.update();
  assert.notEqual(subtitle.textContent, '');
  intro.stop();
  pending.reject(mediaError('NotAllowedError')); await flush();
  video.emit('error'); video.emit('ended'); intro.update();
  assert.equal(video.paused, true);
  assert.equal(video.hidden, true);
  assert.equal(video.currentTime, 0);
  assert.equal(playButton.hidden, true);
  assert.equal(subtitle.textContent, '');
  assert.deepEqual(events, {completed: 0, fallback: 0});
});

test('natural completion fires once and a fresh opening can complete again', async t => {
  const {video, intro, events} = fixture(t);
  intro.start(); await flush();
  video.emit('ended'); video.emit('ended'); video.emit('error');
  assert.equal(events.completed, 1);
  assert.equal(events.fallback, 0);
  assert.equal(intro.active, false);
  intro.start(); await flush(); video.emit('ended');
  assert.equal(events.completed, 2);
});

test('blur and visibility suspension preserve one automatic resume', async t => {
  const {video, intro} = fixture(t);
  intro.start(); await flush(); video.currentTime = 7.5;
  intro.suspend(); intro.suspend();
  assert.equal(video.paused, true);
  assert.equal(video.currentTime, 7.5);
  intro.resume(); intro.resume(); await flush();
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, false);
  assert.equal(video.currentTime, 7.5);
});

test('a manually paused film does not resume when the tab regains focus', async t => {
  const {video, playButton, intro} = fixture(t);
  intro.start(); await flush();
  intro.togglePause(); intro.suspend(); intro.suspend(); intro.resume(); await flush();
  assert.equal(video.playCalls, 1);
  assert.equal(video.paused, true);
  assert.equal(playButton.hidden, false);
  intro.togglePause(); await flush();
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, false);
});

test('initial mute and sound changes apply without restarting playback', async t => {
  const {video, intro} = fixture(t);
  intro.start(true); await flush();
  assert.equal(video.muted, true);
  video.currentTime = 11;
  intro.setMuted(false); assert.equal(video.muted, false);
  intro.setMuted(true); assert.equal(video.muted, true);
  assert.equal(video.currentTime, 11);
  assert.equal(video.playCalls, 1);
});

test('captions follow media time with clean starts, gaps and exclusive ending boundaries', t => {
  const {video, subtitle, intro} = fixture(t);
  const samples = [[0,''],[INTRO_DURATION,'']];
  for(const [start,end,text] of INTRO_CAPTIONS){
    samples.push([start,text],[end-.001,text],[end,'']);
  }
  intro.start();
  for (const [time, expected] of samples) {
    video.currentTime = time; intro.update();
    assert.equal(subtitle.textContent, expected, `caption at ${time}s`);
    assert.equal(introCaption(time), expected);
  }
});

test('unsupported playback enters the in-engine fallback once', async t => {
  const {video, playButton, intro, events} = fixture(t);
  video.responses.push({error: mediaError('NotSupportedError')});
  intro.start(); await flush();
  video.emit('error'); video.emit('ended');
  assert.equal(events.fallback, 1);
  assert.equal(events.completed, 0);
  assert.equal(intro.usingFallback, true);
  assert.equal(video.hidden, true);
  assert.equal(video.paused, true);
  assert.equal(playButton.hidden, true);
});

test('a media error cancels film presentation without completing the journey', async t => {
  const {video, intro, events} = fixture(t);
  intro.start(); await flush();
  video.emit('error'); video.emit('error'); video.emit('ended');
  assert.equal(events.fallback, 1);
  assert.equal(events.completed, 0);
  assert.equal(video.paused, true);
  intro.suspend(); intro.resume();
  assert.equal(video.playCalls, 1);
});

test('an old successful play promise cannot pause a newly started opening', async t => {
  const {video, intro, events} = fixture(t), old = deferred();
  video.responses.push(old);
  intro.start(); intro.stop(); intro.start(); await flush();
  const pauses = video.pauseCalls;
  old.resolve(); await flush();
  assert.equal(video.pauseCalls, pauses);
  assert.equal(video.paused, false);
  assert.equal(intro.active, true);
  assert.deepEqual(events, {completed: 0, fallback: 0});
});

test('an old rejected play promise cannot block or replace the current opening', async t => {
  const {video, playButton, intro, events} = fixture(t), old = deferred();
  video.responses.push(old);
  intro.start(); intro.stop(); intro.start(); await flush();
  old.reject(mediaError('NotSupportedError')); await flush();
  assert.equal(playButton.hidden, true);
  assert.equal(intro.blocked, false);
  assert.equal(intro.usingFallback, false);
  assert.equal(events.fallback, 0);
});

test('replaying resets film time, captions and media-error state', async t => {
  const {video, subtitle, intro} = fixture(t);
  intro.start(); await flush(); video.currentTime = INTRO_CAPTIONS[2][0]+.1; intro.update();
  assert.notEqual(subtitle.textContent, '');
  video.error = {code: 3}; intro.start(true); await flush();
  assert.equal(video.currentTime, 0);
  assert.equal(subtitle.textContent, '');
  assert.equal(video.loadCalls, 1);
  assert.equal(video.error, null);
  assert.equal(video.muted, true);
  assert.equal(video.paused, false);
});

test('the short film has four ordered narration beats within its 30-second runtime',()=>{
  assert.equal(INTRO_DURATION,30);assert.equal(INTRO_CAPTIONS.length,4);
  let previous=0;for(const [start,end,text]of INTRO_CAPTIONS){assert(start>=previous);assert(end>start&&end<=INTRO_DURATION);assert(text.length>15);previous=end;}
});

test('chapters follow scene boundaries instead of equal-length divisions',()=>{
  assert.deepEqual(INTRO_CHAPTERS.map(chapter=>chapter.start),[0,6,16,23]);
  assert.equal(introChapter(-1).index,0);
  assert.equal(introChapter(0).title,'The broken shrine');
  for(let i=1;i<INTRO_CHAPTERS.length;i++){
    const {start,title}=INTRO_CHAPTERS[i];
    assert.equal(introChapter(start-.001).index,i-1);
    assert.deepEqual(introChapter(start),{index:i,start,title});
  }
  assert.equal(introChapter(INTRO_DURATION).title,'A new beginning');
});

test('elapsed labels format the actual duration and tolerate unloaded media',()=>{
  assert.equal(formatIntroTime(0),'0:00');
  assert.equal(formatIntroTime(29.99),'0:29');
  assert.equal(formatIntroTime(INTRO_DURATION),'0:30');
  assert.equal(formatIntroTime(64),'1:04');
  assert.equal(formatIntroTime(-1),'0:00');
  assert.equal(formatIntroTime(NaN),'0:00');
  assert.equal(formatIntroTime(Infinity),'0:00');
});
