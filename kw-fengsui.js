/**
 * kw.js — 风誰·酷我 插件（风誰制作 · 二开专用版 v0.3.2）
 * ------------------------------------------------------------------
 * 风誰制作，仅供个人使用。
 * 本插件是在 Z·酷我原版（wenshao 原作，Super Z 反编译）基础上
 * 二开而来：原版走的老中转 http://ws.suol.cc/kuwo/api 已死
 * （返回 {"detail":"Not Found"}），现改走同一站点的 FreeAPI
 * 上游 https://ws.suol.cc/freeapi/upstream/kuwo/api（搜/播/
 * 歌词/详情四条接口均已实测通过），其余逻辑沿用原版，另修
 * 原版两处缺陷（见下），并去掉 updateURL（防止被更新回原版）。
 * 适用宿主：MusicFree / 同类插件系统
 * 平台标识：风誰·酷我
 * 原作者：wenshao（原始混淆版）
 * 反编译 + 变量重命名 + 注释 by Super Z
 * 二开：风誰
 * ------------------------------------------------------------------
 * 通过 FreeAPI 上游的酷我音乐接口，提供：
 *   1. 关键字搜索歌曲（v0.3.0 起走 search.kuwo.cn/r.s，支持
 *      music/album/sheet/artist 四种类型，分页，带真实时长
 *      与 formats；r.s 失败回退 FreeAPI /search）
 *   2. 多音质播放（flac / 320 / 128）
 *   3. LRC 歌词获取（v0.2.2 起含翻译：中转 LRC 自带交错翻译行）
 *   4. 单曲元信息补全（v0.3.0 起封面改写 800 尺寸）
 *   5. 榜单（v0.2.0 新增）：官方榜单目录 + 榜单详情
 *   6. 歌曲评论（v0.2.1 新增，待真机验证）：走酷我官方评论接口
 *      （非 FreeAPI 上游），主路 comment.kuwo.cn/com.s，后备
 *      www.kuwo.cn/api/www/comment/getComments
 *   7. 专辑与歌手（v0.3.0 新增）：getAlbumInfo / getArtistWorks
 *   8. 真实歌单（v0.3.0 新增）：importMusicSheet /
 *      getMusicSheetInfo（歌单详情页 SSR 前 20 首）
 *   9. 推荐歌单（v0.3.0 新增）：getRecommendSheetTags /
 *      getRecommendSheetsByTag
 *  10. 播放兜底（v0.3.1 新增）：FreeAPI 失败时走酷我官方
 *      mobi.s 直连（type=convert_url_with_sign，服务端签名），
 *      带试听门禁（回包 duration 与已知时长不匹配即丢弃）。
 * ------------------------------------------------------------------
 * v0.3.2 改动（2026-11-28，小更新，升第三位；skill 审计修）：
 *   1. getMediaSource 失败处理改回抛错：两层都拿不到时
 *      throw new Error("获取播放链接失败")，与网易云/酷狗/
 *      QQ 统一，按官方协议来，好让 App 降档重试；0.3.1
 *      的“返回 null”撤销（skill 协议节与兜底节自相矛盾，
 *      以协议为准，兜底节已同步改清）。
 *   2. getMusicInfo 失败时不再 return null，改为返回已有
 *      封面作回落 {artwork: song.artwork}（与 QQ 同款）；
 *      getMusicInfo 永不抛错。
 *   3. 封面回落（每日维护 0.2.4 同款，已同步进本文件）：
 *      cover_url 为空时补搜索结果自带封面。
 *   4. 补 primaryKey: ["id"]。
 * ------------------------------------------------------------------
 * v0.3.1 改动（2026-11-28，小更新，升第三位）：
 *   1. 播放加第二层兜底：FreeAPI 失败时调酷我官方
 *      mobi.kuwo.cn/mobi.s（f=web、source=jiakong、
 *      type=convert_url_with_sign、surl=1），取 data.surl
 *      （https 直链）。来源：pdone/lx-music-source 里 jiexiang
 *      源的“后端 8：酷我官方”写法，取其精华、去其糟粕——只
 *      取这一路官方直连，第三方中转（长青/念心/聆澜/HYW/
 *      溯音）与手机版/车机版变体一律不采用。
 *   2. 试听门禁（jiexiang 原写法没有这一步）：回包必须
 *      code===200、data.surl 为 https 链接，且 duration 与
 *      已知时长匹配——已知时长 D 时回包 < 0.5×D 即试听丢弃；
 *      D 未知时回包 ≤30 秒即试听丢弃。实测：本机出口晴天
 *      （D=269）与七里香（D=299）都只回 duration 11 的通用
 *      试听片段（且与请求 rid 不一致），门禁全部拦下。
 *      真机住宅 IP 上回的是整首还是试听，只有真机能裁决；
 *      若真机也是试听，这层兜底作废、直接删掉。
 *   3. getMediaSource 失败处理：FreeAPI 失败不再抛错，静默
 *      走 mobi.s；两层都拿不到返回 null（与网易云/酷狗/QQ
 *      同款“实在没路只返回空结果”），不弹错不阻塞。FreeAPI
 *      请求本身（URL/参数/超时）一字未动。
 *   4. mobi.s 超时 3 秒；音质映射 low/standard→128kmp3、
 *      high→320kmp3、super→2000kflac（flac 档未经实测，
 *      待真机验收）。
 * ------------------------------------------------------------------
 * v0.1.1 改动（2026-11-22，相对原版 v0.1.1）：
 *   1. BASE_URL 换新中转：http://ws.suol.cc/kuwo/api（已死）→
 *      https://ws.suol.cc/freeapi/upstream/kuwo/api（http→https）。
 *      四条接口路径（/search、/song/{id}/url、/song/{id}/lrc、
 *      /song/{id}）与原版完全一致，只换域名前缀。
 *   2. 修 duration 单位：原版把 duration_s（秒）×1000 当毫秒返回，
 *      MusicFree 协议要的是秒，之前歌曲时长会显示成几千倍。
 *      现直接用秒（与风誰·酷狗 v0.4.5、风誰·网易云同款修法）。
 *   3. search 对非 music 类型直接返回空（原版不查 type，搜专辑
 *      也会把歌曲当专辑返回；与风誰·酷狗 v0.4.7、风誰·网易云
 *      行为一致）。
 *   4. 品牌改为 风誰·酷我（平台/作者/描述/文件头），原作者署名
 *      保留在文件头；去掉 updateURL。
 * v0.2.0 改动（2026-11-22，大更新，升第二位）：
 *   1. 新增榜单：getTopLists / getTopListDetail / getMusicSheetInfo。
 *      榜单目录走酷我官方榜单页 https://www.kuwo.cn/rankList 的
 *      SSR 数据（window.__NUXT__ 里的 bangMenu，5 组 36 榜，带
 *      封面），目录拉取失败重试 3 次、仍失败用内置榜单兜底
 *      （KW_TOPLIST_FALLBACK，2026-11-22 当天实测抓取的 36 榜）。
 *      榜单详情走 kbangserver.kuwo.cn/ksong.s（type=bang），
 *      每页 30 首，时长取 song_duration（duration 字段是脏数据，
 *      别用）；歌曲封面走 FreeAPI /song/{id} 详情批量补
 *      （ksong.s 不给封面，专辑封面地址无法从 albumid 推导）。
 *   2. 榜单详情返回统一补 coverImg/artwork + sheetItem +
 *      topListItem（三处都给，宿主读哪处都有），与风誰·酷狗
 *      v0.4.9 同款结构。
 * v0.2.1 改动（2026-11-22，小更新，升第三位）：
 *   1. 新增评论：getMusicComments（待真机验证，见下）。
 *      主路 comment.kuwo.cn/com.s 经典接口（type=get_comment，
 *      sid=歌曲数字 id，page/rows 翻页，https 不通再试 http）；
 *      后备 www.kuwo.cn/api/www/comment/getComments（带 reqId、
 *      plat=web、UA、Referer，尽力先取首页 cookie 补 kw_token
 *      与 csrf）。两路都失败/无数据时干净返回空数组，不编假
 *      数据、不抛错；返回 {isEnd, data:[{id, nickName, avatar,
 *      comment, like, createAt（毫秒）, location}]}，与风誰·酷狗
 *      /网易云/QQ 同款结构。
 *   2. 搜/播/歌词/详情/榜单逻辑一字未动。
 * v0.2.2 改动（2026-11-23，小更新，升第三位）：
 *   1. 补翻译：getLyric 返回 translation（与网易云/酷狗/QQ 同款
 *      结构）。酷我中转 LRC 里外文歌的翻译行与原文行共用同一时间
 *      戳、中文行紧跟原文行后，extractKwTranslation 按此规则抽
 *      取；中文歌与词/曲等元数据行无对应原文行，不会误收；抽不
 *      到时只返回 rawLrc，旧行为不变。实测《Shape of You》抽出
 *      翻译 87 行、《Perfect》29 行，《孤勇者》等中文歌翻译为空。
 * v0.2.3 改动（2026-11-24，小更新，升第三位）：
 *   1. 搜索缺封面的歌批量调详情接口补上（实测 20 首里 16 首
 *      cover_url 为空），榜单歌曲封面已补的逻辑复用。
 * v0.3.0 改动（2026-11-28，大更新，升第二位）：
 *   1. 多类型搜索：search 支持 music/album/sheet/artist，走
 *      search.kuwo.cn/r.s（参数 pcjson=1 + rformat=json +
 *      encoding=utf8 三者缺一不可——只加 rformat 回单引号
 *      伪 JSON，只加 pcjson 回老式文本；实测）。音乐搜索带
 *      真实 duration 与 formats；专辑/歌单/歌手各走各的
 *      字段（albumlist / abslist / abslist），分页公式
 *      isEnd = (pn+1)*rn >= TOTAL。
 *   2. 新增 getAlbumInfo / getArtistWorks：同走 r.s 的 stype
 *      分支（albuminfo / artist2music / albumlist），注意
 *      stype 分支不能带 all 关键词（带了会忽略 stype，
 *      回普通搜索）；返回的歌曲字段是小写（musicrid /
 *      name / duration / formats），与搜索的 abslist
 *      大写字段不同，归一化时两套都认。
 *   3. 新增 importMusicSheet + 真实歌单详情：三形态输入
 *      （www.kuwo.cn/playlist_detail/<id>、
 *      m.kuwo.cn/h5app/playlist/<id>、纯数字 id，正则已拿
 *      真链接验过）；歌单元信息走 nplserver.kuwo.cn/pl.svc
 *      （op=getlistinfo，GBK 回包，arraybuffer +
 *      TextDecoder("gbk") 解，不支持时回落默认解码）；
 *      歌曲走歌单详情页 SSR 的 musicList（pl.svc 的
 *      musiclist 恒为空，8 种参数组合实测均无歌，别用），
 *      只含前 20 首，isEnd=true（全量分页要走
 *      api/www/playListInfo，服务器侧被拦，待真机验证）。
 *   4. 新增 getRecommendSheetTags / getRecommendSheetsByTag：
 *      标签走 wapi.kuwo.cn（getTagList），置顶 4 标签
 *      （翻唱 1848、网络 621、伤感 146、欧美 35，
 *      digest 均为 "10000"）；digest "10000" 走
 *      getTagPlayList，其他 digest 走
 *      mobileinterfaces.kuwo.cn/er.s（7 种参数组合实测
 *      均回 {"result":"error"}，目前返回空，不阻塞）。
 *   5. 封面 800 + formats 透传：starheads/<n> 与
 *      albumcover/<n> 改写成 /800/（实测 200），无匹配
 *      时保留原 URL；搜索/专辑/歌手结果带 formats。
 *      另修 kwcdn 坏证书：img*.kwcdn.kuwo.cn 的 HTTPS
 *      证书 SAN 里没有 kwcdn 域名，严格校验的客户端
 *      会拒掉；/star/* 路径改写到 img1.kuwo.cn（实测
 *      同字节），非 /star/* 的 kwcdn 地址保留 http。
 *   6. 音乐搜索 r.s 失败时回退 FreeAPI /search（老路），
 *      播放/歌词/详情/榜单/评论逻辑一字未动。
 * 评论（v0.2.1 新增，待真机验证）：原版就没有 getMusicComments；
 *   2026-11-22 服务器侧实测了全部能想到的评论路线，均无真实
 *   数据返回：① comment.kuwo.cn/com.s（经典接口，5 种参数组合、
 *   2 首歌）均 code 600“评论失败”；② kuwo.cn/www.kuwo.cn 的
 *   api/www/comment/getComments 与 getHotComments（GET/POST、
 *   自生成 kw_token + csrf 头、reqId、plat、Origin、Hm cookie
 *   全套组合）均 "The request is illegal!"，且连最基础的
 *   musicInfo 接口也同样被拒——整个 api/www/* 在服务器侧被拦，
 *   不是缺参数；③ wapi.kuwo.cn 404；④ 歌曲详情页 SSR 数据里
 *   没有评论；⑤ FreeAPI 文档（/freeapi/api/docs）酷我只有
 *   搜/详情/歌词/播放/流播 5 个接口，无评论；⑥ 维护中的开源库
 *   music-lib（guohuiyuan）酷我模块也没有评论实现。服务器出口
 *   IP 被酷我标记（榜单页 SSR 一半概率直接 500），手机端住宅
 *   IP 上评论接口有可能通——本版先把接口接上，等用户真机验证，
 *   通了就留着，不通再撤。服务器侧验证预期仍失败，属正常。
 * 搜索结果无时长：上游 /search 只返回 id/歌名/歌手/封面，没有
 *   duration 字段，搜索结果 duration 为 0（原版同样为 0）；
 *   播放/详情时 getMusicInfo 会从 /song/{id} 取回真实秒数。
 *   不为每个搜索结果多调 20 次详情接口补时长（太慢），宿主
 *   刷新详情时会自动补全。
 * 播放兜底（v0.3.1）：FreeAPI → 酷我官方 mobi.s 直连
 *   （带试听门禁）；两层都拿不到返回 null，不抛错。签名直链
 *   有时效，点播时现抓，不缓存。
 * ------------------------------------------------------------------
 * 字段约定：返回的歌曲对象统一为 MusicFree 通用 schema
 *   { id, platform, title, artist, album, artwork, duration }
 * 其中 duration 单位为秒。
 *
 */


const axios = require("axios");
const he = require("he");


// 后端代理基础地址
const BASE_URL = "https://ws.suol.cc/freeapi/upstream/kuwo/api";

const API = BASE_URL;


// v0.3.0：酷我官方搜索接口（多类型搜索 / 专辑 / 歌手）。
// 参数 pcjson=1 + rformat=json + encoding=utf8 三者缺一不可，
// 否则回单引号伪 JSON 或老式文本；https 不通再试 http。
const KW_RS = "https://search.kuwo.cn/r.s";
const KW_RS_HTTP = "http://search.kuwo.cn/r.s";
const KW_RS_COMMON = {
  itemset: "web_2013",
  client: "kt",
  pcjson: 1,
  rformat: "json",
  encoding: "utf8",
  vipver: "MUSIC_9.1.1.2_BCS2",
  devid: "38668888",
};
const KW_RS_PAGE_SIZE = 20;


// v0.3.1：酷我官方直连兜底 mobi.s（FreeAPI 失败时才走）。
// type=convert_url_with_sign 由服务端签名，客户端不用算签名，
// 不走第三方中转；surl=1 让服务器直接回 https 直链。
// 音质映射照抄 jiexiang 源“后端 8：酷我官方”。
const KW_MOBI_S = "https://mobi.kuwo.cn/mobi.s";
const KW_MOBI_UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36";
const KW_MOBI_BR = {
  low: "128kmp3",
  standard: "128kmp3",
  high: "320kmp3",
  super: "2000kflac",
};


// v0.3.0：真实歌单元信息（pl.svc）与推荐歌单（wapi）。
// pl.svc 回包是 GBK 编码（Content-Type 声明 charset=gbk），
// 歌单详情页是 UTF-8 SSR；er.s 目前只回 {"result":"error"}。
const KW_PL_SVC = "http://nplserver.kuwo.cn/pl.svc";
const KW_PL_PAGE_SIZE = 80;
const KW_PL_MAX_PAGES = 30;
const KW_WAPI_TAGLIST =
  "https://wapi.kuwo.cn/api/pc/classify/playlist/getTagList";
const KW_WAPI_TAGPLAYLIST =
  "https://wapi.kuwo.cn/api/pc/classify/playlist/getTagPlayList";
const KW_WAPI_RCMLIST =
  "https://wapi.kuwo.cn/api/pc/classify/playlist/getRcmPlayList";
const KW_ER_S = "https://mobileinterfaces.kuwo.cn/er.s";
const KW_PLAYLIST_PAGE = "https://www.kuwo.cn/playlist_detail/";
// 置顶标签（参考源做法，digest 均为 "10000"，走 getTagPlayList）
const KW_PINNED_TAGS = [
  { id: "1848", title: "翻唱", digest: "10000" },
  { id: "621", title: "网络", digest: "10000" },
  { id: "146", title: "伤感", digest: "10000" },
  { id: "35", title: "欧美", digest: "10000" },
];


// 播放音频时需要带上的 UA 与 Referer，否则 CDN 会返回 403
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/134.0 Safari/537.36";


// 榜单目录页（SSR 数据里有 bangMenu）与榜单歌曲接口
const KW_RANK_PAGE = "https://www.kuwo.cn/rankList";
const KW_BANG_SONGS = "https://kbangserver.kuwo.cn/ksong.s";
const KW_TOP_PAGE_SIZE = 30;


// 评论接口（v0.2.1 新增，待真机验证）：主路 comment.kuwo.cn/com.s
// 经典接口，后备 www.kuwo.cn/api/www/comment/getComments。
// 服务器侧两路均被拦（code 600 / "The request is illegal!"），
// 疑似出口 IP 被标记；手机住宅 IP 有可能通，等真机验证。
const KW_COMMENT_CLASSIC = "https://comment.kuwo.cn/com.s";
const KW_COMMENT_CLASSIC_HTTP = "http://comment.kuwo.cn/com.s";
const KW_COMMENT_WWW = "https://www.kuwo.cn/api/www/comment/getComments";
const KW_COMMENT_PAGE_SIZE = 20;


/**
 * 音质映射：把宿主统一的音质档位（super/high/standard/low）
 * 转成酷我后端识别的字符串
 */
const QUALITY_MAP = {
  super: "flac", // 无损 FLAC
  high: "320", // 320 kbps MP3
  standard: "128", // 128 kbps MP3
  low: "128", // 低音质同样落到 128
};


/**
 * 内置榜单兜底：榜单目录页拉取失败（重试 3 次仍无数据）时用。
 * 2026-11-22 当天从官方榜单页实测抓取的 36 个榜（5 组），
 * sourceid 是 ksong.s 要用的榜单 id，pic 是榜单封面。
 * 注意：zimg 封面地址带当日时间戳，时间久了可能失效；主路
 * 是实时拉取榜单页，本表只在主路失败时兜底。
 */
const KW_TOPLIST_FALLBACK = [
  { group: "官方", items: [
    { sourceid: "16", name: "酷我热歌榜", pic: "https://zimg.kuwo.cn/bang/8/0/1795330201028_489927.png", intro: "榜单规则：按照歌曲在酷我音乐移动端及PC端登录用户中产生的完整播放、下载量、收藏量、搜播量综合热度进行排名，每日更新", pub: "今日更新" },
    { sourceid: "93", name: "酷我飙升榜", pic: "https://zimg.kuwo.cn/bang/0/3/1795330204229_489929.png", intro: "酷我每日搜索热度飙升最快的歌曲排行榜，按搜索播放数据对比前一天涨幅排序，每天更新", pub: "今日更新" },
    { sourceid: "17", name: "酷我新歌榜", pic: "https://zimg.kuwo.cn/bang/3/2/1795330202696_489928.png", intro: "榜单规则：按歌曲完播用户数从高到低进行排序，播放时长大于歌曲时长80%以上即为完整播放，每个登录账号每一首歌仅计算一次完整播放，每天更新", pub: "今日更新" },
    { sourceid: "158", name: "短视频酷我排行榜", pic: "https://zimg.kuwo.cn/bang/8/2/1795330209412_490022.png", intro: "根据公开市场信息分析，以及短视频热门歌曲在酷我音乐平台内的受欢迎情况，选取当日在酷我音乐播放热门歌曲TOP100，每天更新。", pub: "今日更新" },
    { sourceid: "176", name: "万物DJ榜", pic: "https://zimg.kuwo.cn/bang/0/3/1795330227457_534778.png", intro: "榜单规则：按照DJ热播歌曲在酷我音乐移动端及PC端登录用户中产生的完整播放、下载量、收藏量、搜播量综合热度进行排名，每日更新", pub: "今日更新" },
    { sourceid: "145", name: "会员畅听榜", pic: "https://zimg.kuwo.cn/bang/5/5/1795330218022_507077.png", intro: "酷我会员用户最喜爱的付费歌曲排行榜，按歌曲热度、飙升幅度综合排序，每天更新", pub: "今日更新" },
  ] },
  { group: "特色", items: [
    { sourceid: "336", name: "会员飙升榜", pic: "https://zimg.kuwo.cn/bang/1/0/1795329689095_534790.png", intro: "酷我平台每日搜索热度飙升最快的会员歌曲排行榜，按搜索播放数据对比前一天的涨幅排序，每天更新", pub: "今日更新" },
    { sourceid: "331", name: "会员爱听排行榜", pic: "https://zimg.kuwo.cn/bang/4/7/1795329687865_534788.png", intro: "整合酷我会员用户播放热度最高的歌曲排行榜，按歌曲热度排序，每日更新", pub: "今日更新" },
    { sourceid: "330", name: "会员新歌榜", pic: "https://zimg.kuwo.cn/bang/0/1/1795329686661_534787.png", intro: "整合酷我平台近半年发布的最受会员用户喜爱的新歌，按歌曲热度、发行时间综合排序，每日更新", pub: "今日更新" },
    { sourceid: "26", name: "经典怀旧榜", pic: "https://zimg.kuwo.cn/bang/8/0/1795330228584_490003.png", intro: "酷我用户每天播放怀旧歌曲排行榜，按歌曲热度排序，每天更新", pub: "今日更新" },
    { sourceid: "153", name: "网红新歌榜", pic: "https://zimg.kuwo.cn/bang/5/1/1795330233517_490015.png", intro: "酷我用户每天播放网红新歌（90天内发行）排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "278", name: "古风音乐榜", pic: "https://zimg.kuwo.cn/bang/5/5/1795329671900_532224.png", intro: "酷我用户每天播放古风歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "284", name: "酷我热评榜", pic: "https://zimg.kuwo.cn/bang/2/3/1795329673147_532836.png", intro: "酷我用户每天讨论度最高的歌曲排行榜，按歌曲热度、评论综合排序，每天更新", pub: "今日更新" },
    { sourceid: "242", name: "极品电音榜", pic: "https://zimg.kuwo.cn/bang/0/5/1795329665584_531674.png", intro: "酷我用户每天播放电音歌曲排行榜，按歌曲热度排序，每天更新", pub: "今日更新" },
    { sourceid: "187", name: "流行趋势榜", pic: "https://zimg.kuwo.cn/bang/8/0/1795329659257_510021.png", intro: "酷我每日搜索热度飙升最快的歌曲排行榜，按歌曲热度、发行天数综合排序，每天更新", pub: "今日更新" },
    { sourceid: "154", name: "酷我综艺榜", pic: "https://zimg.kuwo.cn/bang/4/6/1795329657969_509842.png", intro: "酷我用户每天播放综艺歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "64", name: "影视金曲榜", pic: "https://zimg.kuwo.cn/bang/9/2/1795330232177_490014.png", intro: "酷我用户每天播放影视歌曲（5年内发行）排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "329", name: "酷我说唱榜", pic: "https://zimg.kuwo.cn/bang/4/7/1795329684092_534776.png", intro: "酷我用户每天播放说唱歌曲排行榜，按歌曲热度排序，每天更新", pub: "今日更新" },
    { sourceid: "291", name: "爆笑相声榜", pic: "https://zimg.kuwo.cn/bang/1/8/1795329679690_534519.png", intro: "酷我用户每天播放相声排行榜，按热度排序，每天更新", pub: "今日更新" },
    { sourceid: "69", name: "儿童歌曲榜", pic: "https://zimg.kuwo.cn/bang/6/9/1795329690354_534809.png", intro: "酷我用户每天播放儿童歌曲排行榜，按热度排序，每天更新", pub: "今日更新" },
    { sourceid: "344", name: "儿童故事榜", pic: "https://zimg.kuwo.cn/bang/8/5/1795329691527_534810.png", intro: "酷我用户每天播放儿童故事排行榜，按热度排序，每天更新", pub: "今日更新" },
  ] },
  { group: "场景", items: [
    { sourceid: "328", name: "车载歌曲榜", pic: "https://zimg.kuwo.cn/bang/2/3/1795329708014_534634.png", intro: "酷我用户每天播放车载音乐排行榜，按歌曲热度排序，每天更新", pub: "今日更新" },
    { sourceid: "297", name: "跑步健身榜", pic: "https://zimg.kuwo.cn/bang/0/9/1795329710434_534636.png", intro: "酷我用户每天播放跑步健身歌曲排行榜，按歌曲热度排序，每天更新", pub: "今日更新" },
    { sourceid: "255", name: "KTV点唱榜", pic: "https://zimg.kuwo.cn/bang/0/3/1795329705174_532517.png", intro: "酷我用户每天播放KTV歌曲排行榜，按歌曲热度排序，每天更新", pub: "今日更新" },
  ] },
  { group: "语言", items: [
    { sourceid: "104", name: "酷我华语榜", pic: "https://zimg.kuwo.cn/bang/8/3/1795329692685_509833.png", intro: "酷我用户每天播放华语歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "182", name: "酷我粤语榜", pic: "https://zimg.kuwo.cn/bang/3/0/1795329693930_509834.png", intro: "酷我用户每天播放粤语歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "22", name: "酷我欧美榜", pic: "https://zimg.kuwo.cn/bang/5/1/1795329695063_509835.png", intro: "酷我用户每天播放欧美歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "184", name: "酷我韩语榜", pic: "https://zimg.kuwo.cn/bang/4/6/1795329696351_509836.png", intro: "酷我用户每天播放韩语歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
    { sourceid: "183", name: "酷我日语榜", pic: "https://zimg.kuwo.cn/bang/8/2/1795329697611_509837.png", intro: "酷我用户每天播放日语歌曲排行榜，按歌曲热度、发行时间综合排序，每天更新", pub: "今日更新" },
  ] },
  { group: "全球", items: [
    { sourceid: "12", name: "美国The Billboard", pic: "https://img4.kuwo.cn/star/upload/10/10/1649672653402_.jpg", intro: "美国公告牌Billboard Hot100单曲榜，每周三更新", pub: "11月19日更新" },
    { sourceid: "180", name: "beatport电音榜", pic: "https://img1.kuwo.cn/star/upload/0/0/1649672695520_.jpg", intro: "beatport全球电子舞曲排行榜，每周二更新", pub: "11月19日更新" },
    { sourceid: "13", name: "英国UK Official", pic: "https://img3.kuwo.cn/star/upload/2/2/1649672715090_.jpg", intro: "英国单曲排行榜（UK Singles Chart）是代表英国唱片工业的权威排行榜，每周六更新", pub: "今日更新" },
    { sourceid: "164", name: "百大DJ榜", pic: "https://img3.kuwo.cn/star/upload/10/10/1649672739226_.jpg", intro: "酷我用户每周播放世界百大DJs歌曲TOP排行榜，每周二更新", pub: "今日更新" },
    { sourceid: "246", name: "YouTube音乐排行榜", pic: "https://img3.kuwo.cn/star/upload/7/7/1649672755016_.jpg", intro: "YouTube是一个视频网站，YouTube音乐排行榜是根据歌曲每周在YouTube的播放量进行排名，每周一更新。", pub: "11月17日更新" },
    { sourceid: "15", name: "日本公信榜", pic: "https://img1.kuwo.cn/star/upload/14/14/1649672798206_.jpg", intro: "日本公信榜也称为Oricon榜，是日本最具知名度的音乐排行榜，每周三更新", pub: "11月19日更新" },
    { sourceid: "293", name: "Space Shower", pic: "https://img1.kuwo.cn/star/upload/3/3/1649672816467_.jpg", intro: "SPACE SHOWER TV设立于1989年，因通过MV和直播节目介绍了日本的众多艺人而备受好评。 本榜单根据频道上的播放次数计算，为你展现日本音乐的流行趋势。 每周三更新。", pub: "今日更新" },
  ] },
];


/**
 * 把后端返回的歌曲原始对象归一化成 MusicFree 通用结构
 * 酷我搜索接口可能返回 song_name 或 name；歌手字段也可能是 singers 或 artist
 * 部分歌曲的 title 是 "歌手 - 歌名" 格式，需要拆分
 * @param {object} raw 后端原始歌曲对象
 * @returns {object} 归一化后的歌曲对象
 */
function normalizeSong(raw) {
  let title = String(raw.song_name || raw.name || "未知歌曲").trim();
  let artist = String(raw.singers || raw.artist || "").trim();

  // 处理 "歌手 - 歌名" 形式的标题
  const splitMatch = title.match(/^(.+?)\s*-\s*(.+)$/);

  if (splitMatch && (splitMatch[1].trim() === artist || !artist)) {
    if (!artist) {
      artist = splitMatch[1].trim();
    }

    title = splitMatch[2].trim();
  }

  return {
    id: String(raw.id || ""),

    platform: "风誰·酷我",

    title: title || "未知歌曲",

    artist: artist || "未知歌手",

    album: raw.album || "",

    artwork: raw.cover_url || raw.cover || "",

    // v0.1.1：上游给的 duration_s 已是秒，MusicFree 协议要秒，
    // 原版 ×1000 当毫秒是错的（时长会显示成几千倍），直接用秒
    duration: Math.floor(Number(raw.duration_s) || 0),
  };
}


/**
 * http → https（封面统一走 https）
 * @param {string} u 原始地址
 * @returns {string} https 地址或空串
 */
function toHttps(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.indexOf("http://") === 0) return "https://" + s.slice(7);
  return s;
}


/**
 * v0.3.0：酷我图片地址修正。img*.kwcdn.kuwo.cn 的 HTTPS
 * 证书是腾讯云共享证书，SAN 里没有 kwcdn 域名，严格校验
 * 的客户端（Node、App 图片加载器）会直接拒绝；但同一
 * /star/* 路径在 img1.kuwo.cn 上能正常取到（实测同字节），
 * 所以 /star/* 路径改写到 img1.kuwo.cn；非 /star/* 的
 * kwcdn 地址保留 http（http 能通，https 证书是坏的）。
 * @param {string} u 原始图片地址
 * @returns {string} 修正后的地址或空串
 */
function kwImageUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  const m = s.match(/^https?:\/\/([^\/]+)(\/.*)$/i);
  if (m && /\.kwcdn\.kuwo\.cn$/i.test(m[1])) {
    if (m[2].indexOf("/star/") === 0) {
      return "https://img1.kuwo.cn" + m[2];
    }
    return "http://" + m[1] + m[2];
  }
  return toHttps(s);
}


/**
 * 平衡扫描：从 startPos 开始，返回配对闭合的 [...] 或 {...} 文本
 * （跳过字符串内的括号；字符串转义按 \" 处理）
 * @param {string} text 全文
 * @param {number} startPos 起始位置（指向开括号）
 * @param {string} openCh 开括号
 * @param {string} closeCh 闭括号
 * @returns {string} 配对文本，扫不到返回 ""
 */
function scanBalanced(text, startPos, openCh, closeCh) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startPos; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === openCh) depth++;
      else if (c === closeCh) {
        depth--;
        if (depth === 0) return text.slice(startPos, i + 1);
      }
    }
  }
  return "";
}


/**
 * 解析榜单页 window.__NUXT__ 的 IIFE 实参表：
 *   window.__NUXT__=(function(a,b,c,...){return {...}}(ARGS));
 * 形参名与实参按位置一一对应，实参是字符串/数字/布尔字面量。
 * @param {string} html 榜单页全文
 * @returns {object|null} {形参名: 实参值}，解析失败返回 null
 */
function parseNuxtArgs(html) {
  const m = html.match(/window\.__NUXT__=\(function\(([^)]*)\)/);
  if (!m) return null;
  const params = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const scriptEnd = html.indexOf("</script>", m.index);
  const span = html.slice(m.index, scriptEnd < 0 ? html.length : scriptEnd);
  const callPos = span.lastIndexOf("}(");
  if (callPos < 0) return null;
  const argsText = span.slice(callPos + 2);
  // 顶层逗号切分（顾及字符串转义），遇到未在字符串内的 ) 即结束
  const toks = [];
  let cur = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < argsText.length; i++) {
    const c = argsText[i];
    if (inStr) {
      cur += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') {
        inStr = true;
        cur += c;
      } else if (c === ",") {
        toks.push(cur);
        cur = "";
      } else if (c === ")") {
        break;
      } else {
        cur += c;
      }
    }
  }
  if (cur.trim() !== "") toks.push(cur);
  const map = {};
  toks.forEach((t, idx) => {
    const name = params[idx];
    if (!name) return;
    const s = t.trim();
    try {
      map[name] = JSON.parse(s);
    } catch (e) {
      map[name] = s;
    }
  });
  return map;
}


/**
 * 反转义 JS 双引号字符串字面量内容（处理 \u002F、\"、\\ 等）
 * @param {string} raw 不含外层引号的原始内容
 * @returns {string} 还原后的字符串
 */
function unescapeJsString(raw) {
  try {
    return JSON.parse('"' + raw + '"');
  } catch (e) {
    return raw;
  }
}


/**
 * 解析 bangMenu 里的一个值：可能是 "quoted" 字符串，也可能是
 * 裸标识符（查 IIFE 实参表，如 sourceid:g → "16"）
 * @param {string} raw 原始 token
 * @param {object} args IIFE 实参表
 * @returns {string} 解析后的字符串
 */
function resolveValue(raw, args) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.charAt(0) === '"') return unescapeJsString(s.slice(1, -1));
  if (args && Object.prototype.hasOwnProperty.call(args, s)) {
    const v = args[s];
    return v === undefined || v === null ? "" : String(v);
  }
  return s;
}


/**
 * 解析榜单页 SSR 数据里的 bangMenu：
 *   bangMenu:[{name:"官方",list:[{sourceid:g,intro:"...",name:"...",
 *   id:"489927",source:a,pic:"https://...",pub:b}, ...]}, ...]
 * @param {string} html 榜单页全文
 * @returns {Array<{group: string, items: Array}>|null}
 */
function parseKwBangMenu(html) {
  const args = parseNuxtArgs(html);
  if (!args) return null;
  const marker = html.indexOf("bangMenu:[");
  if (marker < 0) return null;
  const arrText = scanBalanced(html, marker + "bangMenu:".length, "[", "]");
  if (!arrText) return null;
  const groups = [];
  const groupRe = /\{name:"((?:[^"\\]|\\.)*)",list:\[/g;
  let gm;
  while ((gm = groupRe.exec(arrText)) !== null) {
    const groupName = unescapeJsString(gm[1]);
    const listStart = gm.index + gm[0].length - 1; // 指向 '['
    const listText = scanBalanced(arrText, listStart, "[", "]");
    if (!listText) continue;
    const items = [];
    const itemRe =
      /\{sourceid:("[^"]*"|[A-Za-z_$][\w$]*),intro:"((?:[^"\\]|\\.)*)",name:"([^"]+)",id:"([^"]+)",source:[A-Za-z_$][\w$]*,pic:"((?:[^"\\]|\\.)*)",pub:("[^"]*"|[A-Za-z_$][\w$]*)\}/g;
    let im;
    while ((im = itemRe.exec(listText)) !== null) {
      items.push({
        sourceid: resolveValue(im[1], args),
        intro: unescapeJsString(im[2]),
        name: im[3],
        id: im[4],
        pic: unescapeJsString(im[5]),
        pub: resolveValue(im[6], args),
      });
    }
    if (items.length) groups.push({ group: groupName, items });
  }
  return groups.length ? groups : null;
}


/**
 * 拉取官方榜单目录（带 3 次重试：酷我 SSR 偶尔直接返回 500 错误页，
 * 无 bangMenu 时重试）。全部失败返回 null，由调用方走内置兜底。
 * @returns {Promise<Array<{group: string, items: Array}>|null>}
 */
async function fetchKwRankMenu() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await axios.get(KW_RANK_PAGE, {
        headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
        timeout: 15000,
      });
      const groups = parseKwBangMenu(String(resp.data || ""));
      if (groups) return groups;
    } catch (e) {
      // 重试
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}


/**
 * 拉取一个榜单的一页歌曲（kbangserver，不走 csrf 的老接口）
 * 注意：返回的 duration 字段是脏数据（如 "2"），时长只认 song_duration。
 * @param {string} bangId 榜单 sourceid（如 16 热歌榜、93 飙升榜）
 * @param {number} pageNo 页码（从 1 开始）
 * @param {number} pageSize 每页条数
 * @returns {Promise<{name: string, total: number, songs: Array}>}
 */
async function fetchKwBangSongs(bangId, pageNo, pageSize) {
  const resp = await axios.get(KW_BANG_SONGS, {
    params: {
      from: "pc",
      fmt: "json",
      pn: pageNo - 1,
      rn: pageSize,
      type: "bang",
      data: "content",
      id: String(bangId),
      show_copyright_off: "1",
      pcmp4: "1",
    },
    headers: { "User-Agent": UA, Referer: KW_RANK_PAGE },
    timeout: 15000,
  });
  const body = resp.data || {};
  const list = Array.isArray(body.musiclist) ? body.musiclist : [];
  const songs = list
    .map((it) => {
      const dur = Math.floor(
        Number(it.song_duration) || Number(it.duration) || 0
      );
      return {
        id: String(it.id || ""),
        platform: "风誰·酷我",
        title: String(it.name || "未知歌曲"),
        artist: String(it.artist || "未知歌手"),
        album: String(it.album || ""),
        artwork: "",
        duration: dur > 0 && dur < 100000 ? dur : 0,
      };
    })
    .filter((s) => s.id);
  return {
    name: String(body.name || ""),
    total: parseInt(body.num, 10) || 0,
    songs,
  };
}


/**
 * 批量补榜单歌曲封面：ksong.s 不给封面，专辑封面地址无法从
 * albumid 推导，逐首调 FreeAPI /song/{id} 详情取 cover_url
 * （并发 10，单首失败留空，不阻塞整页）。
 * @param {Array} songs 榜单歌曲列表（原地补 artwork/duration）
 */
async function fillKwSongCovers(songs) {
  const CONC = 10;
  let idx = 0;
  async function worker() {
    while (idx < songs.length) {
      const s = songs[idx++];
      try {
        const r = await axios.get(
          API + "/song/" + encodeURIComponent(s.id),
          { timeout: 10000 }
        );
        const d = r.data && r.data.data;
        // v0.3.0：走 upgradeKwCover（800 尺寸 + kwcdn 坏证书域名修正）
        if (d && d.cover_url) s.artwork = upgradeKwCover(d.cover_url);
        if (!s.duration && d && d.duration_s) {
          s.duration = Math.floor(Number(d.duration_s) || 0);
        }
      } catch (e) {
        // 单首失败留空
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONC, songs.length) }, () => worker())
  );
}


/**
 * v0.3.0：封面尺寸改写。starheads/<n> 与 albumcover/<n>
 * 改写成 /800/（实测 200）；无匹配时保留原 URL（参考源
 * 没写回落会返回 undefined 封面，我们一定保留原 URL）。
 * @param {string} u 原始封面地址
 * @returns {string} 800 尺寸地址或原地址
 */
function upgradeKwCover(u) {
  const s = kwImageUrl(u);
  if (!s) return "";
  const m = s.match(/^(.*\/(?:starheads|albumcover)\/)\d+(\/.*)$/);
  if (m) return m[1] + "800" + m[2];
  return s;
}


/**
 * v0.3.0：r.s 返回的短封面路径拼成完整地址。
 * web_albumpic_short 如 "120/s3s94/93/211513640.jpg"，
 * hts_PICPATH 同理；前缀分别是 albumcover / starheads。
 * @param {string} shortPath 短路径
 * @param {string} kind "albumcover" 或 "starheads"
 * @returns {string} 完整封面地址（800 尺寸）或空串
 */
function kwCoverFromShort(shortPath, kind) {
  const s = String(shortPath || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return upgradeKwCover(s);
  return upgradeKwCover(
    "https://img1.kuwo.cn/star/" + kind + "/" + s.replace(/^\/+/, "")
  );
}


/**
 * v0.3.0：从 MUSICRID / MP3RID / musicrid 里取纯数字 id。
 * r.s 音乐搜索给 "MUSIC_228908"，stype 分支直接给 "228908"，
 * FreeAPI 的 /song/{id} 与 /song/{id}/url 都认纯数字 id。
 * @param {string} rid MUSICRID / MP3RID / 纯数字
 * @returns {string} 纯数字 id 或空串
 */
function kwNumericId(rid) {
  const s = String(rid || "").trim();
  if (!s) return "";
  const m = s.match(/(\d+)\s*$/);
  return m ? m[1] : "";
}


/**
 * v0.3.0：归一化一条 r.s 歌曲。搜索 abslist 用大写字段
 * （SONGNAME / MUSICRID / DURATION / FORMATS），stype 分支
 * 的 musiclist 用小写字段（name / musicrid / duration /
 * formats），两套都认；标题/歌手/专辑在边界处 he.decode 一次。
 * @param {object} raw 原始歌曲对象
 * @returns {object|null} 归一化歌曲，无 id 返回 null
 */
function normalizeKwRsSong(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = kwNumericId(
    raw.MUSICRID || raw.musicrid || raw.MP3RID || raw.mp3rid || raw.id || ""
  );
  if (!id) return null;
  const title = he
    .decode(String(raw.SONGNAME || raw.songname || raw.name || "未知歌曲"))
    .trim();
  const artist = he
    .decode(String(raw.ARTIST || raw.artist || ""))
    .trim();
  const album = he.decode(String(raw.ALBUM || raw.album || "")).trim();
  const artwork = kwCoverFromShort(
    raw.web_albumpic_short || raw.PICPATH || "",
    "albumcover"
  );
  const out = {
    id,
    platform: "风誰·酷我",
    title: title || "未知歌曲",
    artist: artist || "未知歌手",
    album,
    artwork,
    duration: Math.floor(
      Number(raw.DURATION || raw.duration || 0) || 0
    ),
  };
  const formats = String(raw.FORMATS || raw.formats || "").trim();
  if (formats) out.formats = formats;
  return out;
}


/**
 * v0.3.0：归一化一条 r.s 专辑（albumlist 里的项）。
 * @param {object} raw 原始专辑对象
 * @returns {object|null} 归一化专辑，无 id 返回 null
 */
function normalizeKwRsAlbum(raw) {
  if (!raw || typeof raw !== "object") return null;
  const albumid = String(raw.albumid || raw.id || "").trim();
  if (!albumid) return null;
  const title = he.decode(String(raw.name || raw.title || "未知专辑")).trim();
  const artist = he.decode(String(raw.artist || "")).trim();
  const artwork = upgradeKwCover(raw.hts_img || raw.img || "");
  return {
    id: "kwalbum:" + albumid,
    albumId: albumid,
    platform: "风誰·酷我",
    title: title || "未知专辑",
    artist: artist || "未知歌手",
    artwork,
    description: [raw.company || "", raw.pub || ""]
      .filter(Boolean)
      .join(" · "),
  };
}


/**
 * v0.3.0：归一化一条 r.s 歌单（playlist 搜索 abslist 里的项）。
 * @param {object} raw 原始歌单对象
 * @returns {object|null} 归一化歌单，无 id 返回 null
 */
function normalizeKwRsSheet(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pid = String(raw.playlistid || raw.id || "").trim();
  if (!pid) return null;
  const title = he.decode(String(raw.name || raw.title || "未知歌单")).trim();
  const creator = he.decode(String(raw.nickname || "")).trim();
  return {
    id: "kwlist:" + pid,
    platform: "风誰·酷我",
    title: title || "未知歌单",
    artist: creator,
    artwork: kwImageUrl(raw.hts_pic || raw.pic || ""),
    description: he.decode(String(raw.intro || "")).slice(0, 200),
    playCount: Number(raw.playcnt || 0) || 0,
    songCount: Number(raw.songnum || 0) || 0,
  };
}


/**
 * v0.3.0：归一化一位 r.s 歌手（artist 搜索 abslist 里的项）。
 * @param {object} raw 原始歌手对象
 * @returns {object|null} 归一化歌手，无 id 返回 null
 */
function normalizeKwRsArtist(raw) {
  if (!raw || typeof raw !== "object") return null;
  const artistid = String(raw.ARTISTID || raw.artistid || "").trim();
  if (!artistid) return null;
  const name = he.decode(String(raw.ARTIST || raw.artist || "未知歌手")).trim();
  return {
    id: "kwartist:" + artistid,
    platform: "风誰·酷我",
    title: name || "未知歌手",
    artist: name || "未知歌手",
    artwork: kwCoverFromShort(raw.hts_PICPATH || raw.PICPATH || "", "starheads"),
    description: he.decode(String(raw.desc || "")).slice(0, 200),
  };
}


/**
 * v0.3.0：调 search.kuwo.cn/r.s。https 不通再试 http；
 * 回包可能是字符串（axios 不解析 text/plain），手动 JSON.parse。
 * @param {object} params 请求参数（不含公共参数）
 * @returns {Promise<object|null>} 解析后的 JSON，失败返回 null
 */
async function fetchKwRs(params) {
  const allParams = Object.assign({}, KW_RS_COMMON, params);
  for (const base of [KW_RS, KW_RS_HTTP]) {
    try {
      const resp = await axios.get(base, {
        params: allParams,
        headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
        timeout: 15000,
      });
      const body =
        typeof resp.data === "string"
          ? JSON.parse(resp.data)
          : resp.data;
      if (body && typeof body === "object") return body;
    } catch (e) {
      // 换下一条路
    }
  }
  return null;
}


/**
 * v0.3.0：从歌单详情页 SSR 数据里解析 musicList。
 * 页里 window.__NUXT__ 的 IIFE 实参表把单字母形参映射到
 * 真实值，musicList 里的项用单字母变量引用这些值（与榜单页
 * bangMenu 同款写法），用 parseNuxtArgs + resolveValue 还原。
 * 注意：SSR 只含前 20 首；项里的 album 字段是标志位不是
 * 专辑名，歌曲 album 留空（播放时 getMusicInfo 会补）。
 * @param {string} html 歌单详情页全文
 * @returns {Array|null} 歌曲列表，解析失败返回 null
 */
function parseKwPlaylistSongs(html) {
  const args = parseNuxtArgs(html);
  if (!args) return null;
  const marker = html.indexOf("musicList:[");
  if (marker < 0) return null;
  const arrText = scanBalanced(html, marker + "musicList:".length, "[", "]");
  if (!arrText) return null;
  const songs = [];
  let pos = 1;
  // 顶层逐个取 {...} 对象（musicList 是对象数组）
  while (pos < arrText.length) {
    const start = arrText.indexOf("{", pos);
    if (start < 0) break;
    const objText = scanBalanced(arrText, start, "{", "}");
    if (!objText) break;
    pos = start + objText.length;
    const fields = {};
    const re =
      /([A-Za-z_$][\w$]*):("(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?)/g;
    let mm;
    while ((mm = re.exec(objText)) !== null) {
      fields[mm[1]] = resolveValue(mm[2], args);
    }
    const id = kwNumericId(fields.rid || fields.musicrid || "");
    if (!id) continue;
    songs.push({
      id,
      platform: "风誰·酷我",
      title: he.decode(String(fields.name || "未知歌曲")).trim() || "未知歌曲",
      artist:
        he.decode(String(fields.artist || "")).trim() || "未知歌手",
      album: "",
      artwork: toHttps(fields.pic || fields.pic120 || ""),
      duration: Math.floor(Number(fields.duration || 0) || 0),
    });
  }
  return songs;
}


/**
 * v0.3.0：拉取歌单详情页 SSR 的前 20 首歌（3 次重试：
 * 酷我 SSR 偶尔直接返回 500 错误页）。全部失败返回 null。
 * @param {string} pid 歌单纯数字 id
 * @returns {Promise<Array|null>}
 */
async function fetchKwPlaylistSongs(pid) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await axios.get(KW_PLAYLIST_PAGE + encodeURIComponent(pid), {
        headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
        timeout: 15000,
      });
      const songs = parseKwPlaylistSongs(String(resp.data || ""));
      if (songs && songs.length) return songs;
    } catch (e) {
      // 重试
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}


/**
 * v0.3.0：拉取歌单元信息（pl.svc，op=getlistinfo）。
 * 回包是 GBK 编码：先试 arraybuffer + TextDecoder("gbk")
 * （Node 侧可行；App 侧看 Hermes 是否支持 gbk），不支持
 * 时回落默认解码（App 的 XHR 按 charset=gbk 解码；Node 侧
 * 回落会中文乱码，但结构与 id 不变）。
 * 注意：pl.svc 只给元信息，musiclist 恒为空，别用它取歌。
 * @param {string} pid 歌单纯数字 id
 * @returns {Promise<object|null>} {title, pic, total, ...}
 */
async function fetchKwPlaylistMeta(pid) {
  const params = {
    op: "getlistinfo",
    pid: String(pid),
    pn: 0,
    rn: 1,
    keyset: "pl2012",
  };
  try {
    const r = await axios.get(KW_PL_SVC, {
      params,
      headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
      timeout: 15000,
      responseType: "arraybuffer",
    });
    if (typeof TextDecoder !== "undefined") {
      return JSON.parse(new TextDecoder("gbk").decode(r.data));
    }
    throw new Error("no TextDecoder");
  } catch (e) {
    // 回落：默认解码
  }
  try {
    const r2 = await axios.get(KW_PL_SVC, {
      params,
      headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
      timeout: 15000,
    });
    const d = typeof r2.data === "string" ? JSON.parse(r2.data) : r2.data;
    return d && typeof d === "object" ? d : null;
  } catch (e) {
    return null;
  }
}


/**
 * v0.3.0：解析歌单输入（三形态）。正则已拿真链接验过：
 * 参考源的 www 正则写错了（www/kuwo.cn 斜杠），真地址是
 * www.kuwo.cn 圆点，我们按正确正则写。
 * @param {string} input 用户粘贴的链接或纯数字 id
 * @returns {string} 纯数字歌单 id，解析失败返回 ""
 */
function parseKwPlaylistId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  let m = s.match(/www\.kuwo\.cn\/playlist_detail\/(\d+)/);
  if (m) return m[1];
  m = s.match(/m\.kuwo\.cn\/h5app\/playlist\/(\d+)/);
  if (m) return m[1];
  m = s.match(/^(\d+)$/);
  if (m) return m[1];
  return "";
}


/**
 * v0.3.0：归一化一条推荐歌单（wapi getTagPlayList /
 * getRcmPlayList / er.s 返回的项，字段名一致）。
 * @param {object} raw 原始歌单对象
 * @returns {object|null} 归一化歌单，无 id 返回 null
 */
function normalizeKwRecommendSheet(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pid = String(raw.id || "").trim();
  if (!pid) return null;
  return {
    id: "kwlist:" + pid,
    platform: "风誰·酷我",
    title: he.decode(String(raw.name || "未知歌单")).trim() || "未知歌单",
    artist: he.decode(String(raw.uname || "")).trim(),
    artwork: kwImageUrl(raw.img || ""),
    description: he.decode(String(raw.desc || raw.info || "")).slice(0, 200),
    playCount: Number(raw.listencnt || 0) || 0,
    createUserId: String(raw.uid || ""),
  };
}


/**
 * 归一化一条酷我评论（防御式：两路接口字段名不完全一致，
 * 各取其有；时间可能是秒，统一转毫秒）。
 * @param {object} raw 原始评论对象
 * @returns {{id: string, nickName: string, avatar: string, comment: string, like: number, createAt: number, location: string}}
 */
function normalizeKwComment(raw) {
  const t0 =
    Number(
      raw.time ||
        raw.ctime ||
        raw.create_time ||
        raw.createTime ||
        raw.addtime ||
        0
    ) || 0;
  return {
    id: String(raw.id || raw.comment_id || raw.cid || ""),
    nickName: String(
      raw.u_name ||
        raw.uname ||
        raw.nickName ||
        raw.nickname ||
        raw.user_name ||
        "酷我用户"
    ),
    avatar: toHttps(
      raw.u_pic || raw.upic || raw.avatar || raw.user_pic || raw.head_pic || ""
    ),
    comment: String(raw.msg || raw.content || raw.comment || raw.text || ""),
    like: Number(raw.like || raw.like_count || raw.praise || raw.likeNum || 0) || 0,
    createAt: t0 > 0 && t0 < 1e12 ? t0 * 1000 : t0,
    location: String(raw.ip || raw.location || raw.area || raw.city || ""),
  };
}


/**
 * 从评论接口回包里抽评论列表（防御式：容器可能是
 * data.rows / data.list / rows / list；拿不到结构返回 null）。
 * @param {object} body 接口回包
 * @returns {Array|null}
 */
function extractKwCommentRows(body) {
  if (!body || typeof body !== "object") return null;
  const d = body.data && typeof body.data === "object" ? body.data : body;
  const rows = d.rows || d.list || d.comments || body.rows || body.list;
  return Array.isArray(rows) ? rows : null;
}


/**
 * 评论主路：comment.kuwo.cn/com.s 经典接口
 * （type=get_comment，sid=歌曲数字 id，page/rows 翻页）。
 * https 不通再试 http；回包无列表或明确失败返回 null。
 * @param {string} sid 歌曲数字 id
 * @param {number} pageNo 页码（从 1 开始）
 * @returns {Promise<{rows: Array, total: number}|null>}
 */
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/;
const LRC_LINE_RE = /^\[(\d+:\d+(?:\.\d+)?)\]\s*(.*)$/;

// 从中转 LRC 里抽翻译（v0.2.2 新增）：酷我中转给外文歌的歌词里，
// 翻译行与原文行共用同一时间戳、中文行紧跟在原文行后面
// （如 [00:11.99]The club isn't... / [00:11.99]俱乐部不是...）。
// 只认“同一时间戳下既有非中文行又有中文行”的中文行作翻译；
// 中文歌的歌词行与词/曲/编曲等元数据行没有对应的原文行，不会误收。
// 抽不到时返回 ""，原歌词一字不动；解析失败也不抛错。
function extractKwTranslation(rawLrc) {
  try {
    if (!rawLrc) return "";
    const byTs = new Map();
    for (const line of rawLrc.split("\n")) {
      const m = line.match(LRC_LINE_RE);
      if (!m) continue;
      const text = (m[2] || "").trim();
      if (!text) continue;
      let g = byTs.get(m[1]);
      if (!g) {
        g = { hasNonCjk: false, cjk: [] };
        byTs.set(m[1], g);
      }
      if (CJK_RE.test(text)) g.cjk.push(text);
      else g.hasNonCjk = true;
    }
    const out = [];
    for (const [ts, g] of byTs) {
      if (g.hasNonCjk && g.cjk.length) {
        for (const t of g.cjk) out.push("[" + ts + "]" + t);
      }
    }
    return out.join("\n");
  } catch (e) {
    return "";
  }
}

async function fetchKwCommentsClassic(sid, pageNo) {
  const params = {
    type: "get_comment",
    sid: String(sid),
    page: pageNo,
    rows: KW_COMMENT_PAGE_SIZE,
    f: "web",
    uid: "0",
  };
  for (const base of [KW_COMMENT_CLASSIC, KW_COMMENT_CLASSIC_HTTP]) {
    try {
      const resp = await axios.get(base, {
        params,
        headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
        timeout: 10000,
      });
      const body = resp.data || {};
      const rows = extractKwCommentRows(body);
      if (!rows) continue;
      // 有 code 字段时只认 200；没 code 字段但有列表的也认
      if (body.code !== undefined && Number(body.code) !== 200) continue;
      const total =
        Number(
          (body.data && (body.data.total || body.data.count)) ||
            body.total ||
            body.count ||
            0
        ) || 0;
      return { rows, total };
    } catch (e) {
      // 换下一条路
    }
  }
  return null;
}


/**
 * 评论后备：www.kuwo.cn/api/www/comment/getComments。
 * 先尽力取首页 cookie（kw_token / csrf，8 秒超时，拿不到
 * 也不阻塞），再调接口；被拦或无数据返回 null。
 * @param {string} sid 歌曲数字 id
 * @param {number} pageNo 页码（从 1 开始）
 * @returns {Promise<{rows: Array, total: number}|null>}
 */
async function fetchKwCommentsWww(sid, pageNo) {
  let cookie = "";
  let csrf = "";
  try {
    const home = await axios.get("https://www.kuwo.cn/", {
      headers: { "User-Agent": UA },
      timeout: 8000,
    });
    const setCookie = home.headers && home.headers["set-cookie"];
    if (Array.isArray(setCookie)) cookie = setCookie.join("; ");
    const m = cookie.match(/kw_token=([^;]+)/);
    if (m) csrf = m[1];
  } catch (e) {
    // 拿不到 cookie 也不阻塞，继续调接口
  }
  try {
    const headers = {
      "User-Agent": UA,
      Referer: "https://www.kuwo.cn/",
      Origin: "https://www.kuwo.cn",
    };
    if (cookie) headers.Cookie = cookie;
    if (csrf) headers.csrf = csrf;
    const resp = await axios.get(KW_COMMENT_WWW, {
      params: {
        sid: String(sid),
        type: "get_comment",
        page: pageNo,
        rows: KW_COMMENT_PAGE_SIZE,
        reqId: String(Date.now()) + Math.floor(Math.random() * 1000),
        plat: "web",
      },
      headers,
      timeout: 10000,
    });
    const body = resp.data || {};
    const rows = extractKwCommentRows(body);
    if (!rows) return null;
    if (body.code !== undefined && Number(body.code) !== 200) return null;
    const total =
      Number(
        (body.data && (body.data.total || body.data.count)) ||
          body.total ||
          body.count ||
          0
      ) || 0;
    return { rows, total };
  } catch (e) {
    return null;
  }
}


/**
 * v0.3.1：调酷我官方 mobi.s 拿播放直链（FreeAPI 失败时的第二层）。
 * 只取 jiexiang 源“后端 8：酷我官方”的写法，第三方中转与手机版/
 * 车机版变体一律不采用。试听门禁：回包 duration（秒）与已知时长
 * 不匹配时返回 null——已知时长 D 时回包 < 0.5×D 即试听；D 未知
 * 时回包 ≤30 秒即试听。本机出口实测晴天/七里香都只回 11 秒通用
 * 试听，门禁全部拦下；真机住宅 IP 上回整首还是试听，待真机验证。
 * @param {{id: string, duration?: number, rid?: string, musicrid?: string}} song 歌曲对象
 * @param {string} quality 音质档位 super/high/standard/low
 * @returns {Promise<string|null>} https 直链或 null（失败/试听）
 */
async function fetchKwMobiUrl(song, quality) {
  const br = KW_MOBI_BR[quality] || "128kmp3";
  const rawId = song.rid || song.musicrid || song.id || "";
  const rid = String(rawId)
    .replace(/^(MUSIC_|MP3_)/i, "")
    .replace(/\D/g, "");
  if (!rid) return null;
  let resp;
  try {
    resp = await axios.get(KW_MOBI_S, {
      params: {
        f: "web",
        rid: rid,
        br: br,
        source: "jiakong",
        type: "convert_url_with_sign",
        surl: 1,
      },
      headers: { "User-Agent": KW_MOBI_UA },
      timeout: 3000,
    });
  } catch (e) {
    return null;
  }
  const d = resp.data && resp.data.data;
  if (
    !resp.data ||
    resp.data.code !== 200 ||
    !d ||
    typeof d.surl !== "string" ||
    d.surl.indexOf("https://") !== 0
  ) {
    return null;
  }
  const retDur = Number(d.duration) || 0;
  const knownDur = Number(song.duration) || 0;
  if (knownDur > 0) {
    if (retDur < knownDur * 0.5) return null;
  } else if (retDur <= 30) {
    return null;
  }
  return d.surl;
}


module.exports = {
  platform: "风誰·酷我",

  version: "0.3.2",

  primaryKey: ["id"],

  author: "风誰",

  description: "酷我音乐：多类型搜索/专辑/歌手/歌单导入/推荐歌单/多音质播放/歌词/榜单/评论",

  cacheControl: "no-cache",

  supportedSearchType: ["music", "album", "sheet", "artist"],

  hints: {
    importMusicSheet: ["粘贴酷我 App 分享的歌单链接，或纯数字歌单 id"],
  },

  /**
   * 关键字搜索（v0.3.0：music/album/sheet/artist 四种类型）
   * 主路 search.kuwo.cn/r.s（音乐带真实时长与 formats）；
   * 音乐搜索 r.s 失败时回退 FreeAPI /search（老路）。
   * 分页：page 从 1 开始，r.s 里 pn = page - 1（从 0 开始），
   * isEnd = (pn+1)*rn >= TOTAL（统一分页公式）。
   * @param {string} keyword  搜索关键字
   * @param {number} page     页码（从 1 开始）
   * @param {string} type     搜索类型 music/album/sheet/artist
   * @returns {{isEnd: boolean, data: Array}}
   */
  async search(keyword, page, type) {
    const t = type || "music";
    const pageNo = page && page > 0 ? page : 1;
    const pn = pageNo - 1;

    if (t === "music") {
      // 主路 r.s
      try {
        const body = await fetchKwRs({
          all: keyword,
          ft: "music",
          pn,
          rn: KW_RS_PAGE_SIZE,
        });
        const list = body && Array.isArray(body.abslist) ? body.abslist : null;
        if (list) {
          const total = Number(body.TOTAL || 0) || 0;
          const songs = list.map(normalizeKwRsSong).filter(Boolean);
          // r.s 封面一般都有，缺的再走详情接口补（老逻辑）
          const noCover = songs.filter((s) => !s.artwork);
          if (noCover.length) {
            await fillKwSongCovers(noCover);
          }
          return {
            isEnd:
              total > 0
                ? pageNo * KW_RS_PAGE_SIZE >= total
                : songs.length < KW_RS_PAGE_SIZE,
            data: songs,
          };
        }
      } catch (e) {
        // 回退 FreeAPI
      }
      // 回退：FreeAPI /search（v0.2.3 前的老路，不分页）
      try {
        const response = await axios.get(API + "/search", {
          params: { msg: keyword, num: 20 },
          timeout: 20000,
        });
        const body = response.data;
        if (
          !body ||
          !body.ok ||
          !body.data ||
          !Array.isArray(body.data.items)
        ) {
          return { isEnd: true, data: [] };
        }
        const songs = body.data.items.map(normalizeSong);
        const noCover = songs.filter((s) => !s.artwork);
        if (noCover.length) {
          await fillKwSongCovers(noCover);
        }
        return { isEnd: true, data: songs };
      } catch (e) {
        return { isEnd: true, data: [] };
      }
    }

    if (t === "album") {
      // 专辑搜索回包不用 abslist：{albumlist: [...], total}
      try {
        const body = await fetchKwRs({
          all: keyword,
          ft: "album",
          pn,
          rn: KW_RS_PAGE_SIZE,
        });
        const list =
          body && Array.isArray(body.albumlist) ? body.albumlist : null;
        if (!list) return { isEnd: true, data: [] };
        const total = Number(body.total || 0) || 0;
        return {
          isEnd:
            total > 0
              ? pageNo * KW_RS_PAGE_SIZE >= total
              : list.length < KW_RS_PAGE_SIZE,
          data: list.map(normalizeKwRsAlbum).filter(Boolean),
        };
      } catch (e) {
        return { isEnd: true, data: [] };
      }
    }

    if (t === "sheet") {
      try {
        const body = await fetchKwRs({
          all: keyword,
          ft: "playlist",
          pn,
          rn: KW_RS_PAGE_SIZE,
        });
        const list = body && Array.isArray(body.abslist) ? body.abslist : null;
        if (!list) return { isEnd: true, data: [] };
        const total = Number(body.TOTAL || 0) || 0;
        return {
          isEnd:
            total > 0
              ? pageNo * KW_RS_PAGE_SIZE >= total
              : list.length < KW_RS_PAGE_SIZE,
          data: list.map(normalizeKwRsSheet).filter(Boolean),
        };
      } catch (e) {
        return { isEnd: true, data: [] };
      }
    }

    if (t === "artist") {
      try {
        const body = await fetchKwRs({
          all: keyword,
          ft: "artist",
          pn,
          rn: KW_RS_PAGE_SIZE,
        });
        const list = body && Array.isArray(body.abslist) ? body.abslist : null;
        if (!list) return { isEnd: true, data: [] };
        const total = Number(body.TOTAL || 0) || 0;
        return {
          isEnd:
            total > 0
              ? pageNo * KW_RS_PAGE_SIZE >= total
              : list.length < KW_RS_PAGE_SIZE,
          data: list.map(normalizeKwRsArtist).filter(Boolean),
        };
      } catch (e) {
        return { isEnd: true, data: [] };
      }
    }

    return { isEnd: true, data: [] };
  },


  /**
   * 获取播放地址
   * @param {{id: string}} song      歌曲对象
   * @param {string}       quality   音质档位 super/high/standard/low
   * @returns {{url: string, headers: object}}
   */
  async getMediaSource(song, quality) {
    const qualityCode = QUALITY_MAP[quality] || "128";

    // 第一层：FreeAPI（现行逻辑，请求本身一字未动；v0.3.1 起失败
    // 不再抛错，静默走第二层）。v0.1.1 的先验逻辑仍在：上游 /url
    // 对不存在的 id 也会照常拼出一条链接，先调 /song/{id} 验一下，
    // 不存在就走兜底，不直接返回错链。
    try {
      const check = await axios.get(
        API + "/song/" + encodeURIComponent(song.id),
        { timeout: 15000 }
      );
      if (check.data && check.data.ok && check.data.data) {
        const response = await axios.get(
          API + "/song/" + encodeURIComponent(song.id) + "/url",
          {
            params: { quality: qualityCode },

            timeout: 25000,
          }
        );
        const body = response.data;
        if (body && body.ok && body.data && body.data.url) {
          return {
            url: body.data.url,

            headers: {
              "User-Agent": UA,

              Referer: "http://www.kuwo.cn/",
            },
          };
        }
      }
    } catch (e) {
      // FreeAPI 失败：静默走第二层，不抛错
    }

    // 第二层：mobi.s 官方直连兜底（v0.3.1），试听门禁在内；
    // v0.3.2：两层都拿不到改抛错——统一四插件行为，按官方协议来，
    // 好让 App 降档重试；0.3.1 的“返回 null”撤销（见 skill 审计结论）。
    const mobiUrl = await fetchKwMobiUrl(song, quality);
    if (mobiUrl) {
      return {
        url: mobiUrl,
        headers: {
          "User-Agent": KW_MOBI_UA,
          Referer: "http://www.kuwo.cn/",
        },
      };
    }
    throw new Error("获取播放链接失败");
  },


  /**
   * 获取 LRC 歌词
   * @param {{id: string}} song 歌曲对象
   * @returns {{rawLrc: string} | null}
   */
  async getLyric(song) {
    const response = await axios.get(
      API + "/song/" + encodeURIComponent(song.id) + "/lrc",
      { timeout: 15000 }
    );

    const body = response.data;

    if (!body || !body.ok || !body.data || !body.data.lrc) {
      return null;
    }

    const rawLrc = body.data.lrc;
    // v0.2.2：中转 LRC 自带交错翻译行，抽出来当 translation（与网易云/
    // 酷狗/QQ 同款返回结构）；抽不到时只返回 rawLrc，行为与旧版一致。
    return { rawLrc, translation: extractKwTranslation(rawLrc) };
  },


  /**
   * 获取单曲元信息（用于宿主刷新歌曲详情）
   * @param {{id: string, title?: string, artist?: string}} song 已知部分信息的歌曲
   * @returns {object | null}
   */
  async getMusicInfo(song) {
    try {
      const response = await axios.get(
        API + "/song/" + encodeURIComponent(song.id),
        { timeout: 25000 }
      );

      const body = response.data;

      if (!body || !body.ok || !body.data) {
        // v0.3.2：失败时返回已有封面作回落（与 QQ 同款），不再直接
        // return null；getMusicInfo 永不抛错，免得堵住播放。
        return { artwork: song.artwork || "" };
      }

      const data = body.data;

      return {
        id: String(data.id || song.id),

        platform: "风誰·酷我",

        title: data.song_name || song.title || "未知歌曲",

        artist: data.singers || song.artist || "未知歌手",

        album: data.album || "",

        // v0.3.0：封面改写 800 尺寸（starheads/<n> 与
        // albumcover/<n> → /800/），无匹配保留原 URL；
        // v0.3.0+fix：cover_url 为空时回落到搜索结果自带封面
        // （中转 /song/{id} 间歇不给 cover_url，实测 5 次里 1 次为空）
        artwork: upgradeKwCover(data.cover_url || song.artwork || ""),

        // v0.1.1：duration_s 已是秒，直接用秒
        duration: Math.floor(Number(data.duration_s) || 0),
      };
    } catch (e) {
      // v0.3.2：网络错 / HTTP 4xx 也永不抛错，只回已有封面。
      return { artwork: (song && song.artwork) || "" };
    }
  },


  /**
   * 获取歌曲评论（v0.2.1 新增，待真机验证）
   * 主路 comment.kuwo.cn/com.s 经典接口，后备
   * www.kuwo.cn/api/www/comment/getComments；两路都失败或
   * 无数据时干净返回空数组，不编假数据、不抛错。
   * 服务器侧两路均被拦（code 600 / "The request is illegal!"），
   * 预期仍失败，属正常；手机住宅 IP 有可能通，等真机验证。
   * @param {{id: string}} musicItem 歌曲对象
   * @param {number} page 页码（从 1 开始）
   * @returns {Promise<{isEnd: boolean, data: Array}>}
   */
  async getMusicComments(musicItem, page) {
    const sid = String(musicItem.id || "");
    if (!sid) return { isEnd: true, data: [] };
    const pageNo = page && page > 0 ? page : 1;
    let got = null;
    try {
      got = await fetchKwCommentsClassic(sid, pageNo);
    } catch (e) {
      got = null;
    }
    if (!got) {
      try {
        got = await fetchKwCommentsWww(sid, pageNo);
      } catch (e) {
        got = null;
      }
    }
    if (!got) return { isEnd: true, data: [] };
    const rows = got.rows.filter((r) => r && typeof r === "object");
    return {
      isEnd: got.total
        ? pageNo * KW_COMMENT_PAGE_SIZE >= got.total
        : rows.length < KW_COMMENT_PAGE_SIZE,
      data: rows.map(normalizeKwComment),
    };
  },


  /**
   * 榜单目录（v0.2.0 新增）
   * 主路：官方榜单页 SSR 数据（bangMenu，5 组 36 榜，带封面）；
   * 主路 3 次重试仍失败时用内置榜单兜底；再失败返回空分组，不抛错。
   * @returns {Promise<Array<{title: string, data: Array}>>}
   */
  async getTopLists() {
    let groups = null;
    try {
      groups = await fetchKwRankMenu();
    } catch (e) {
      groups = null;
    }
    if (!groups || !groups.length) groups = KW_TOPLIST_FALLBACK;
    return groups.map((g) => ({
      title: g.group,
      data: g.items.map((it) => ({
        title: it.name,
        id: "kwbang:" + String(it.sourceid),
        description: it.intro || "",
        coverImg: toHttps(it.pic),
        artwork: toHttps(it.pic),
      })),
    }));
  },


  /**
   * 榜单详情（v0.2.0 新增）
   * 榜单 id 形如 "kwbang:16"（16=热歌榜、93=飙升榜、17=新歌榜…）。
   * 详情返回统一补 coverImg/artwork + sheetItem + topListItem
   * （三处都给，宿主读哪处都有），与风誰·酷狗 v0.4.9 同款结构。
   * @param {{id?: string, title?: string, artwork?: string, coverImg?: string, description?: string}} sheet 榜单对象
   * @param {number} pageNo 页码（从 1 开始）
   * @returns {Promise<{isEnd: boolean, musicList: Array, coverImg: string, artwork: string, sheetItem: object, topListItem: object}>}
   */
  async getTopListDetail(sheet, pageNo) {
    const sheetId = String(sheet.id || "");
    if (sheetId.indexOf("kwbang:") !== 0) {
      return { isEnd: true, musicList: [] };
    }
    const bangId = sheetId.slice(7);
    const page = pageNo && pageNo > 0 ? pageNo : 1;
    let fb = null;
    try {
      fb = await fetchKwBangSongs(bangId, page, KW_TOP_PAGE_SIZE);
    } catch (e) {
      fb = null;
    }
    if (!fb || !fb.songs.length) {
      return { isEnd: true, musicList: [] };
    }
    // 榜单歌曲本身无封面：批量调详情补封面（失败留空，不阻塞）
    await fillKwSongCovers(fb.songs);
    const firstArt =
      (fb.songs.find((s) => s.artwork) || {}).artwork || "";
    const cover =
      toHttps(sheet.coverImg || sheet.artwork || "") || firstArt;
    const title = fb.name || sheet.title || "酷我榜单";
    return {
      isEnd:
        page * KW_TOP_PAGE_SIZE >= (fb.total || 0) ||
        fb.songs.length < KW_TOP_PAGE_SIZE,
      musicList: fb.songs,
      coverImg: cover,
      artwork: cover,
      sheetItem: {
        title,
        artwork: cover,
        coverImg: cover,
        description: sheet.description || "",
      },
      topListItem: {
        id: sheetId,
        platform: "风誰·酷我",
        title,
        coverImg: cover,
        description: sheet.description || "",
      },
    };
  },


  /**
   * 歌单详情（v0.2.0 新增榜单；v0.3.0 新增真实歌单）
   * 榜单（id 为 "kwbang:<sourceid>"）复用 getTopListDetail；
   * 真实歌单（id 为 "kwlist:<pid>"）：元信息走 pl.svc，
   * 歌曲走歌单详情页 SSR（前 20 首，isEnd=true）。
   * @param {{id?: string, title?: string, artist?: string, artwork?: string, coverImg?: string, description?: string}} sheet 歌单对象
   * @param {number} page 页码（从 1 开始）
   * @returns {Promise<{isEnd: boolean, musicList: Array, sheetItem: object}>}
   */
  async getMusicSheetInfo(sheet, page) {
    const rawId = String(sheet.id || "");
    if (rawId.indexOf("kwbang:") === 0) {
      const d = await this.getTopListDetail(sheet, page);
      return {
        isEnd: d.isEnd,
        musicList: d.musicList || [],
        sheetItem: {
          id: rawId,
          title: (d.sheetItem && d.sheetItem.title) || sheet.title || "酷我榜单",
          artist: sheet.artist || "",
          artwork: (d.sheetItem && d.sheetItem.artwork) || "",
          description: sheet.description || "",
        },
      };
    }
    if (rawId.indexOf("kwlist:") === 0) {
      const pid = rawId.slice(7);
      const pageNo = page && page > 0 ? page : 1;
      // SSR 只含前 20 首，第 2 页起没有可验证的歌源，直接结束
      if (pageNo > 1) {
        return { isEnd: true, musicList: [] };
      }
      let meta = null;
      try {
        meta = await fetchKwPlaylistMeta(pid);
      } catch (e) {
        meta = null;
      }
      let songs = null;
      try {
        songs = await fetchKwPlaylistSongs(pid);
      } catch (e) {
        songs = null;
      }
      if (!songs || !songs.length) {
        return { isEnd: true, musicList: [] };
      }
      const title =
        (meta && he.decode(String(meta.title || "")).trim()) ||
        sheet.title ||
        "酷我歌单";
      const pic =
        (meta && kwImageUrl(meta.pic || "")) ||
        kwImageUrl(sheet.artwork || sheet.coverImg || "");
      const total = (meta && Number(meta.total || 0)) || songs.length;
      return {
        isEnd: true,
        musicList: songs,
        sheetItem: {
          id: rawId,
          title,
          artist: sheet.artist || "",
          artwork: pic,
          description: sheet.description || "",
        },
        // 顺带给调用方 total（SSR 只含前 20 首时 total > 20）
        total,
      };
    }
    return { isEnd: true, musicList: [] };
  },


  /**
   * 专辑详情（v0.3.0 新增）
   * 走 r.s 的 stype=albuminfo 分支（不带 all 关键词）：
   * 回包是专辑元信息 + musiclist（小写字段歌曲）。
   * @param {{id?: string, albumId?: string, title?: string, artist?: string, artwork?: string}} album 专辑对象
   * @returns {Promise<{isEnd: boolean, albumItem: object, musicList: Array}>}
   */
  async getAlbumInfo(album) {
    const rawId = String((album && (album.albumId || album.id)) || "");
    const albumid = rawId.replace(/^kwalbum:/, "");
    if (!albumid || !/^\d+$/.test(albumid)) {
      return { isEnd: true, albumItem: {}, musicList: [] };
    }
    let body = null;
    try {
      body = await fetchKwRs({
        ft: "music",
        pn: 0,
        rn: 100,
        stype: "albuminfo",
        albumid,
      });
    } catch (e) {
      body = null;
    }
    if (!body || !Array.isArray(body.musiclist)) {
      return { isEnd: true, albumItem: {}, musicList: [] };
    }
    const songs = body.musiclist.map(normalizeKwRsSong).filter(Boolean);
    // 专辑内歌曲继承专辑封面（albumItem.artwork ?? res.img）
    const cover = upgradeKwCover(body.hts_img || body.img || "");
    for (const s of songs) {
      if (!s.artwork) s.artwork = cover;
      if (!s.album && body.name) {
        s.album = he.decode(String(body.name)).trim();
      }
    }
    return {
      isEnd: true,
      albumItem: {
        id: "kwalbum:" + albumid,
        platform: "风誰·酷我",
        title:
          he.decode(String(body.name || (album && album.title) || "未知专辑")).trim() ||
          "未知专辑",
        artist:
          he.decode(String(body.artist || (album && album.artist) || "")).trim(),
        artwork: cover,
        description: [body.company || "", body.pub || ""]
          .filter(Boolean)
          .join(" · "),
      },
      musicList: songs,
    };
  },


  /**
   * 歌手作品（v0.3.0 新增）
   * type/album 分支：music 走 stype=artist2music，
   * album 走 stype=albumlist（都不带 all 关键词）；
   * 回包字段与搜索不同（musiclist / albumlist + total 小写）。
   * @param {{id?: string, title?: string, name?: string}} artist 歌手对象
   * @param {number} page 页码（从 1 开始）
   * @param {string} type "music" 或 "album"
   * @returns {Promise<{isEnd: boolean, data: Array}>}
   */
  async getArtistWorks(artist, page, type) {
    const rawId = String((artist && artist.id) || "");
    const artistid = rawId.replace(/^kwartist:/, "");
    if (!artistid || !/^\d+$/.test(artistid)) {
      return { isEnd: true, data: [] };
    }
    const pageNo = page && page > 0 ? page : 1;
    const pn = pageNo - 1;
    const name = (artist && (artist.name || artist.title)) || "";
    if (type === "album") {
      let body = null;
      try {
        body = await fetchKwRs({
          ft: "music",
          pn,
          rn: KW_RS_PAGE_SIZE,
          stype: "albumlist",
          artistid,
        });
      } catch (e) {
        body = null;
      }
      if (!body || !Array.isArray(body.albumlist)) {
        return { isEnd: true, data: [] };
      }
      const total = Number(body.total || 0) || 0;
      return {
        isEnd:
          total > 0
            ? pageNo * KW_RS_PAGE_SIZE >= total
            : body.albumlist.length < KW_RS_PAGE_SIZE,
        data: body.albumlist.map(normalizeKwRsAlbum).filter(Boolean),
      };
    }
    let body = null;
    try {
      body = await fetchKwRs({
        ft: "music",
        pn,
        rn: KW_RS_PAGE_SIZE,
        stype: "artist2music",
        artistid,
      });
    } catch (e) {
      body = null;
    }
    if (!body || !Array.isArray(body.musiclist)) {
      return { isEnd: true, data: [] };
    }
    const total = Number(body.total || 0) || 0;
    const songs = body.musiclist.map(normalizeKwRsSong).filter(Boolean);
    for (const s of songs) {
      if (!s.artist && name) s.artist = String(name);
    }
    return {
      isEnd:
        total > 0
          ? pageNo * KW_RS_PAGE_SIZE >= total
          : songs.length < KW_RS_PAGE_SIZE,
      data: songs,
    };
  },


  /**
   * 导入歌单（v0.3.0 新增）
   * 解析三形态输入（网页链接 / H5 链接 / 纯数字 id），
   * 元信息走 pl.svc，返回歌单 stub；歌曲由
   * getMusicSheetInfo 按需拉取（SSR 前 20 首）。
   * @param {string} input 用户粘贴的链接或纯数字 id
   * @returns {Promise<object|null>} 歌单对象，解析失败返回 null
   */
  async importMusicSheet(input) {
    const pid = parseKwPlaylistId(input);
    if (!pid) return null;
    let meta = null;
    try {
      meta = await fetchKwPlaylistMeta(pid);
    } catch (e) {
      meta = null;
    }
    if (!meta || meta.result === "fail") return null;
    return {
      id: "kwlist:" + pid,
      platform: "风誰·酷我",
      title:
        he.decode(String(meta.title || "酷我歌单")).trim() || "酷我歌单",
      artist: he.decode(String(meta.uname || "")).trim(),
      artwork: kwImageUrl(meta.pic || ""),
      description: he.decode(String(meta.info || "")).slice(0, 200),
    };
  },


  /**
   * 推荐歌单标签（v0.3.0 新增）
   * 走 wapi getTagList；置顶 4 标签另加（翻唱/网络/伤感/
   * 欧美，digest 均为 "10000"）。失败返回空分组，不抛错。
   * @returns {Promise<{pinned: Array, data: Array}>}
   */
  async getRecommendSheetTags() {
    let groups = [];
    try {
      const resp = await axios.get(KW_WAPI_TAGLIST, {
        params: { cmd: "rcm_keyword_playlist" },
        headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
        timeout: 15000,
      });
      const body =
        typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
      if (body && body.code === 200 && Array.isArray(body.data)) {
        groups = body.data;
      }
    } catch (e) {
      groups = [];
    }
    const data = groups
      .map((g) => ({
        title: String(g.name || ""),
        data: (Array.isArray(g.data) ? g.data : [])
          .map((t) => ({
            id: String(t.id || ""),
            title: String(t.name || ""),
            digest: String(t.digest || ""),
          }))
          .filter((t) => t.id && t.title),
      }))
      .filter((g) => g.title && g.data.length);
    return {
      pinned: KW_PINNED_TAGS.map((t) => ({
        id: t.id,
        title: t.title,
        digest: t.digest,
      })),
      data,
    };
  },


  /**
   * 按标签拉取推荐歌单（v0.3.0 新增）
   * digest "10000" 走 getTagPlayList；其他 digest 走
   * er.s（目前只回 {"result":"error"}，返回空，不阻塞）；
   * 无标签走 getRcmPlayList?order=hot。
   * @param {{id?: string, digest?: string}} tag 标签对象
   * @param {number} page 页码（从 1 开始）
   * @returns {Promise<{isEnd: boolean, data: Array}>}
   */
  async getRecommendSheetsByTag(tag, page) {
    const pageNo = page && page > 0 ? page : 1;
    const rn = KW_RS_PAGE_SIZE;
    if (!tag || !tag.id) {
      // 无标签：热门推荐
      try {
        const resp = await axios.get(KW_WAPI_RCMLIST, {
          params: { cmd: "getRcmPlayList", order: "hot", pn: pageNo, rn },
          headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
          timeout: 15000,
        });
        const body =
          typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
        const list =
          body && body.data && Array.isArray(body.data.data)
            ? body.data.data
            : null;
        if (!list) return { isEnd: true, data: [] };
        const total = Number((body.data && body.data.total) || 0) || 0;
        return {
          isEnd:
            total > 0 ? pageNo * rn >= total : list.length < rn,
          data: list.map(normalizeKwRecommendSheet).filter(Boolean),
        };
      } catch (e) {
        return { isEnd: true, data: [] };
      }
    }
    const digest = String(tag.digest || "");
    if (digest === "10000") {
      try {
        const resp = await axios.get(KW_WAPI_TAGPLAYLIST, {
          params: { cmd: "getTagPlayList", id: String(tag.id), pn: pageNo, rn },
          headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
          timeout: 15000,
        });
        const body =
          typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
        const list =
          body && body.data && Array.isArray(body.data.data)
            ? body.data.data
            : null;
        if (!list) return { isEnd: true, data: [] };
        const total = Number((body.data && body.data.total) || 0) || 0;
        return {
          isEnd:
            total > 0 ? pageNo * rn >= total : list.length < rn,
          data: list.map(normalizeKwRecommendSheet).filter(Boolean),
        };
      } catch (e) {
        return { isEnd: true, data: [] };
      }
    }
    // 其他 digest 走 er.s（目前回 {"result":"error"}，返回空）
    try {
      const resp = await axios.get(KW_ER_S, {
        params: {
          type: "get_pc_qz_data",
          digest,
          id: String(tag.id),
          pn: pageNo,
          rn,
        },
        headers: { "User-Agent": UA, Referer: "https://www.kuwo.cn/" },
        timeout: 15000,
      });
      const body =
        typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
      const list =
        (body && Array.isArray(body.data) && body.data) ||
        (body && body.data && Array.isArray(body.data.data) && body.data.data) ||
        (body && Array.isArray(body.list) && body.list) ||
        null;
      if (!list) return { isEnd: true, data: [] };
      const total =
        Number((body.data && body.data.total) || body.total || 0) || 0;
      return {
        isEnd: total > 0 ? pageNo * rn >= total : list.length < rn,
        data: list.map(normalizeKwRecommendSheet).filter(Boolean),
      };
    } catch (e) {
      return { isEnd: true, data: [] };
    }
  },
};
