/**
 * 真寻表情包元数据与工具
 * 资源位于 public/stickers/mahiro/
 */

import { QQ_DEFAULT_STICKER_PACK } from "./stickers-qqnt";

export interface StickerItem {
    id: string;
    name?: string;
    path: string;
    /** 主源（CDN）加载失败时的兜底地址，如后端本地缓存路由 */
    fallback?: string;
    /** QQ 经典表情的 [CQ:face,id]，有值时该表情按 face 段发送 */
    faceId?: string;
    type?: "image" | "emoji";
    category?: string;
    tags?: string[];
    jp_text?: string;
    description?: string;
    scenario?: string;
    dimensions?: string;
    filename?: string;
    local_path?: string;
}

export interface MahiroSticker extends StickerItem {
    filename: string;
    category: string;
    tags: string[];
    scenario: string;
    jp_text: string;
    description: string;
    dimensions: string;
}

export interface StickerPack {
    id: string;
    name: string;
    icon: string;
    iconType?: "image" | "icon";
    type: "image" | "emoji";
    /** 图片网格密度：sm = QQ 式密集小格无文字；缺省 = lg 大格带名称 */
    density?: "sm" | "lg";
    description?: string;
    categories?: string[];
    stickers: StickerItem[];
}

export const MAHIRO_STICKERS: MahiroSticker[] = [
    {
        "id": "01",
        "filename": "01_打招呼_回家啦.png",
        "path": "/stickers/mahiro/01_打招呼_回家啦.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\01_打招呼_回家啦.png",
        "category": "日常社交",
        "tags": [
            "问候",
            "下班",
            "放学",
            "回家",
            "打招呼"
        ],
        "scenario": "群聊发言、刚上线、下班打卡、回到家报备",
        "jp_text": "帰宅!!",
        "description": "真寻开门挥手打招呼，元气满满地说回家啦",
        "dimensions": "370x320"
    },
    {
        "id": "02",
        "filename": "02_庆祝_欢呼哇咿.png",
        "path": "/stickers/mahiro/02_庆祝_欢呼哇咿.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\02_庆祝_欢呼哇咿.png",
        "category": "开心庆祝",
        "tags": [
            "欢呼",
            "开心",
            "庆祝",
            "胜利",
            "好耶"
        ],
        "scenario": "中奖、抽卡出金、考试通过、计划达成庆祝",
        "jp_text": "わーい",
        "description": "真寻高举双手开心大笑欢呼",
        "dimensions": "370x320"
    },
    {
        "id": "03",
        "filename": "03_绝望_抱头痛哭.png",
        "path": "/stickers/mahiro/03_绝望_抱头痛哭.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\03_绝望_抱头痛哭.png",
        "category": "绝望悲伤",
        "tags": [
            "绝望",
            "崩溃",
            "扯头发",
            "抓狂",
            "痛苦"
        ],
        "scenario": "代码Bug、电脑死机、抽卡沉船、遭遇惨事",
        "jp_text": "ご無体なぁ〜",
        "description": "真寻扯着头发泪流满面喊着'太不讲理了'",
        "dimensions": "370x320"
    },
    {
        "id": "04",
        "filename": "04_道歉_对不起流泪.png",
        "path": "/stickers/mahiro/04_道歉_对不起流泪.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\04_道歉_对不起流泪.png",
        "category": "道歉认错",
        "tags": [
            "道歉",
            "对不起",
            "抱歉",
            "认错",
            "流泪"
        ],
        "scenario": "做错事认错、迟到抱歉、给对方添麻烦时",
        "jp_text": "ごめんね",
        "description": "真寻双手合十垂头道歉，眼角挂着眼泪",
        "dimensions": "370x320"
    },
    {
        "id": "05",
        "filename": "05_疑惑_歪头问号.png",
        "path": "/stickers/mahiro/05_疑惑_歪头问号.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\05_疑惑_歪头问号.png",
        "category": "疑惑疑问",
        "tags": [
            "问号",
            "疑惑",
            "不解",
            "懵逼",
            "求解答"
        ],
        "scenario": "没听懂、对话题表示疑惑、对方发了看不懂的东西",
        "jp_text": "？",
        "description": "真寻歪着脑袋头上冒出黄色大问号",
        "dimensions": "370x320"
    },
    {
        "id": "06",
        "filename": "06_得意_叉腰哼哼.png",
        "path": "/stickers/mahiro/06_得意_叉腰哼哼.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\06_得意_叉腰哼哼.png",
        "category": "得意炫耀",
        "tags": [
            "得意",
            "叉腰",
            "哼哼",
            "夸我",
            "炫耀"
        ],
        "scenario": "做成了某件事、吹牛、装逼、自豪求表扬",
        "jp_text": "どやっ",
        "description": "真寻双手叉腰昂首挺胸闭眼哼哼得意",
        "dimensions": "370x320"
    },
    {
        "id": "07",
        "filename": "07_惊恐_贴玻璃求救.png",
        "path": "/stickers/mahiro/07_惊恐_贴玻璃求救.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\07_惊恐_贴玻璃求救.png",
        "category": "惊恐慌乱",
        "tags": [
            "惊慌",
            "害怕",
            "救命",
            "眩晕",
            "放我出去"
        ],
        "scenario": "面临危险、被迫加班、被大佬迫害、惊慌失措",
        "jp_text": "",
        "description": "真寻双手拍在玻璃上双眼转圈惊恐求救",
        "dimensions": "370x320"
    },
    {
        "id": "08",
        "filename": "08_忍耐_咬牙憋屈.png",
        "path": "/stickers/mahiro/08_忍耐_咬牙憋屈.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\08_忍耐_咬牙憋屈.png",
        "category": "情绪忍耐",
        "tags": [
            "忍耐",
            "憋屈",
            "不甘心",
            "握拳",
            "咬牙"
        ],
        "scenario": "被怼了但无法反驳、游戏输了不甘心、默默忍受苦难",
        "jp_text": "",
        "description": "真寻双拳紧握咬牙切齿满头汗水忍耐",
        "dimensions": "370x320"
    },
    {
        "id": "09",
        "filename": "09_晚安_准备睡觉.png",
        "path": "/stickers/mahiro/09_晚安_准备睡觉.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\09_晚安_准备睡觉.png",
        "category": "作息日常",
        "tags": [
            "睡觉",
            "晚安",
            "困了",
            "哈欠",
            "下线"
        ],
        "scenario": "睡前道别、熬不动了、准备下线、打哈欠",
        "jp_text": "寝まーす",
        "description": "真寻戴着粉色睡帽捂嘴打哈欠准备睡觉",
        "dimensions": "370x320"
    },
    {
        "id": "10",
        "filename": "10_早安_被窝探头.png",
        "path": "/stickers/mahiro/10_早安_被窝探头.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\10_早安_被窝探头.png",
        "category": "作息日常",
        "tags": [
            "早安",
            "起床",
            "醒了",
            "被窝",
            "迷糊"
        ],
        "scenario": "清晨上线、刚睡醒打招呼、起床报到",
        "jp_text": "おはよ〜〜…",
        "description": "真寻裹着被子睡眼惺忪揉眼睛说早安",
        "dimensions": "370x320"
    },
    {
        "id": "11",
        "filename": "11_卖萌_猫耳喵呜.png",
        "path": "/stickers/mahiro/11_卖萌_猫耳喵呜.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\11_卖萌_猫耳喵呜.png",
        "category": "卖萌可爱",
        "tags": [
            "猫耳",
            "卖萌",
            "可爱",
            "喵喵",
            "撒娇"
        ],
        "scenario": "日常撒娇、求关注、扮可爱、群聊活跃气氛",
        "jp_text": "にゃーん",
        "description": "真寻头上冒出猫耳双手做猫爪姿势喵喵叫",
        "dimensions": "370x320"
    },
    {
        "id": "12",
        "filename": "12_应答_在的举手.png",
        "path": "/stickers/mahiro/12_应答_在的举手.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\12_应答_在的举手.png",
        "category": "日常社交",
        "tags": [
            "到",
            "举手",
            "在的",
            "收到",
            "报名"
        ],
        "scenario": "点名应答、有人问'谁在'、报名活动、积极响应",
        "jp_text": "はーい！",
        "description": "真寻微笑着高高举起右手活力应答",
        "dimensions": "370x320"
    },
    {
        "id": "13",
        "filename": "13_害羞_大红脸冒烟.png",
        "path": "/stickers/mahiro/13_害羞_大红脸冒烟.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\13_害羞_大红脸冒烟.png",
        "category": "害羞难为情",
        "tags": [
            "害羞",
            "脸红",
            "难为情",
            "被夸",
            "冒烟"
        ],
        "scenario": "被夸奖不好意思、被撩到、感到尴尬羞涩",
        "jp_text": "かああああ…",
        "description": "真寻双手捂脸满面通红头上冒蒸汽",
        "dimensions": "370x320"
    },
    {
        "id": "14",
        "filename": "14_暗爽_害羞傻笑.png",
        "path": "/stickers/mahiro/14_暗爽_害羞傻笑.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\14_暗爽_害羞傻笑.png",
        "category": "害羞喜悦",
        "tags": [
            "傻笑",
            "暗爽",
            "偷笑",
            "不好意思",
            "挠头"
        ],
        "scenario": "被喜欢的人搭话、听到好消息、被夸后心里暗爽",
        "jp_text": "でへ〜〜〜",
        "description": "真寻侧头挠后脑勺扯着衣角害羞傻笑",
        "dimensions": "370x320"
    },
    {
        "id": "15",
        "filename": "15_冷漠_面瘫无语.png",
        "path": "/stickers/mahiro/15_冷漠_面瘫无语.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\15_冷漠_面瘫无语.png",
        "category": "冷淡态度",
        "tags": [
            "无语",
            "冷漠",
            "面瘫",
            "已读不回",
            "嫌弃"
        ],
        "scenario": "冷场、看到离谱言论、不想说话、面无表情直视",
        "jp_text": "すん…",
        "description": "真寻面无表情眼神冷淡地默默盯着",
        "dimensions": "370x320"
    },
    {
        "id": "16",
        "filename": "16_消沉_抱膝失落.png",
        "path": "/stickers/mahiro/16_消沉_抱膝失落.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\16_消沉_抱膝失落.png",
        "category": "失落沮丧",
        "tags": [
            "失落",
            "消沉",
            "委屈",
            "抱膝",
            "自闭"
        ],
        "scenario": "被打击到了、愿望落空、独自委屈、自闭中",
        "jp_text": "しゅん…",
        "description": "真寻坐在地上抱住双膝低头沮丧自闭",
        "dimensions": "370x320"
    },
    {
        "id": "17",
        "filename": "17_赞同_我太懂了.png",
        "path": "/stickers/mahiro/17_赞同_我太懂了.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\17_赞同_我太懂了.png",
        "category": "赞同共鸣",
        "tags": [
            "赞同",
            "理解",
            "同感",
            "懂了",
            "附议"
        ],
        "scenario": "深有同感、完全赞同对方看法、说得太对了",
        "jp_text": "わかる〜〜",
        "description": "真寻微笑着连连点头眼神充满共鸣",
        "dimensions": "370x320"
    },
    {
        "id": "18",
        "filename": "18_出行_出门出发.png",
        "path": "/stickers/mahiro/18_出行_出门出发.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\18_出行_出门出发.png",
        "category": "日常作息",
        "tags": [
            "出门",
            "出发",
            "上学",
            "再见",
            "走了"
        ],
        "scenario": "准备出门、去上班上学、暂离电脑外出",
        "jp_text": "行ってきまーす",
        "description": "真寻背着双肩包回头挥手说我出发啦",
        "dimensions": "370x320"
    },
    {
        "id": "19",
        "filename": "19_乖巧_浅笑倾听.png",
        "path": "/stickers/mahiro/19_乖巧_浅笑倾听.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\19_乖巧_浅笑倾听.png",
        "category": "乖巧温和",
        "tags": [
            "乖巧",
            "微笑",
            "听话",
            "好学生",
            "倾听"
        ],
        "scenario": "安静听讲、礼貌微笑、做个乖宝宝、围观不语",
        "jp_text": "",
        "description": "真寻端正坐着两颊带粉温和安静地微笑",
        "dimensions": "370x320"
    },
    {
        "id": "20",
        "filename": "20_恶寒_背后发凉.png",
        "path": "/stickers/mahiro/20_恶寒_背后发凉.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\20_恶寒_背后发凉.png",
        "category": "惊悚警觉",
        "tags": [
            "发凉",
            "恶寒",
            "冷汗",
            "察觉不妙",
            "战栗"
        ],
        "scenario": "感觉有人在背后议论、预感大祸临头、被吓到",
        "jp_text": "ぞわ！",
        "description": "真寻全身发凉直冒冷汗瞳孔收缩",
        "dimensions": "370x320"
    },
    {
        "id": "21",
        "filename": "21_悠闲_享受躺平.png",
        "path": "/stickers/mahiro/21_悠闲_享受躺平.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\21_悠闲_享受躺平.png",
        "category": "悠闲放松",
        "tags": [
            "悠闲",
            "躺平",
            "放松",
            "摸鱼",
            "假期"
        ],
        "scenario": "周末放假、摸鱼划水、享受慢生活、佛系心态",
        "jp_text": "のんびりいこう",
        "description": "真寻双手枕头躺在地上闭眼享受日光浴",
        "dimensions": "370x320"
    },
    {
        "id": "22",
        "filename": "22_心动_小鹿乱撞.png",
        "path": "/stickers/mahiro/22_心动_小鹿乱撞.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\22_心动_小鹿乱撞.png",
        "category": "心动期待",
        "tags": [
            "心动",
            "期待",
            "紧张",
            "双眼发光",
            "扑通扑通"
        ],
        "scenario": "开箱前一刻、遇到喜欢的事物、充满期待紧张",
        "jp_text": "ドキドキ",
        "description": "真寻双手握在胸前满眼星星心跳加速",
        "dimensions": "370x320"
    },
    {
        "id": "23",
        "filename": "23_炎热_流汗吃冰.png",
        "path": "/stickers/mahiro/23_炎热_流汗吃冰.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\23_炎热_流汗吃冰.png",
        "category": "夏日天气",
        "tags": [
            "好热",
            "夏天",
            "冰棒",
            "流汗",
            "融化了"
        ],
        "scenario": "天气炎热、军训/户外晒成狗、夏日解暑",
        "jp_text": "あづ…",
        "description": "真寻满头大汗吐着舌头无精打采吃着冰棒",
        "dimensions": "370x320"
    },
    {
        "id": "24",
        "filename": "24_吃货_狂喜大肉.png",
        "path": "/stickers/mahiro/24_吃货_狂喜大肉.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\24_吃货_狂喜大肉.png",
        "category": "美食干饭",
        "tags": [
            "吃肉",
            "干饭",
            "饿了",
            "大餐",
            "开饭"
        ],
        "scenario": "下馆子吃大餐、犒劳自己、准备开饭、肚子饿",
        "jp_text": "肉!!",
        "description": "真寻高举香喷喷的大骨头肉双眼放光欢呼",
        "dimensions": "370x320"
    },
    {
        "id": "25",
        "filename": "25_美食_美味享受.png",
        "path": "/stickers/mahiro/25_美食_美味享受.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\25_美食_美味享受.png",
        "category": "美食干饭",
        "tags": [
            "好吃",
            "美味",
            "享受",
            "满足",
            "干饭人"
        ],
        "scenario": "品尝美食中、夸赞饭菜好吃、吃饱喝足很幸福",
        "jp_text": "うまうま",
        "description": "真寻拿刀叉眯眼咀嚼享受美食美味",
        "dimensions": "370x320"
    },
    {
        "id": "26",
        "filename": "26_求助_双手合十拜托.png",
        "path": "/stickers/mahiro/26_求助_双手合十拜托.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\26_求助_双手合十拜托.png",
        "category": "请求拜托",
        "tags": [
            "拜托",
            "求求了",
            "请帮帮我",
            "合十",
            "诚恳"
        ],
        "scenario": "请别人帮忙、求带飞、求给个资源/解答、祈求好运",
        "jp_text": "おねがい〜〜",
        "description": "真寻双手合十双眼紧闭流泪大声祈求拜托",
        "dimensions": "370x320"
    },
    {
        "id": "27",
        "filename": "27_装傻_吐舌不知道.png",
        "path": "/stickers/mahiro/27_装傻_吐舌不知道.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\27_装傻_吐舌不知道.png",
        "category": "装傻卖萌",
        "tags": [
            "装傻",
            "吐舌",
            "不知道",
            "甩锅",
            "蒙混过关"
        ],
        "scenario": "被问住不会回答、试图蒙混过关、装无辜",
        "jp_text": "わかんない〜！",
        "description": "真寻手指点着脸颊调皮吐舌眨眼装作不知道",
        "dimensions": "370x320"
    },
    {
        "id": "28",
        "filename": "28_看戏_愉悦坏笑.png",
        "path": "/stickers/mahiro/28_看戏_愉悦坏笑.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\28_看戏_愉悦坏笑.png",
        "category": "乐子看戏",
        "tags": [
            "愉悦",
            "看戏",
            "坏笑",
            "吃瓜",
            "乐子人"
        ],
        "scenario": "围观群友翻车、吃到大瓜、搞事成功、暗爽吃瓜",
        "jp_text": "愉悦ッ",
        "description": "真寻双手搭着下巴露出狡黠的小恶魔坏笑",
        "dimensions": "370x320"
    },
    {
        "id": "29",
        "filename": "29_失神_神志不清被玩坏.png",
        "path": "/stickers/mahiro/29_失神_神志不清被玩坏.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\29_失神_神志不清被玩坏.png",
        "category": "脱力懵圈",
        "tags": [
            "被玩坏",
            "失神",
            "神志不清",
            "阿黑颜",
            "升天"
        ],
        "scenario": "被巨量工作/高难Boss折磨到神志恍惚、大脑宕机",
        "jp_text": "あへ〜〜〜…",
        "description": "真寻双眼涣散张口流口水呈失神状态",
        "dimensions": "370x320"
    },
    {
        "id": "30",
        "filename": "30_分享_分你西瓜.png",
        "path": "/stickers/mahiro/30_分享_分你西瓜.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\30_分享_分你西瓜.png",
        "category": "社交互动",
        "tags": [
            "分享",
            "西瓜",
            "请你吃",
            "给你",
            "友善"
        ],
        "scenario": "给朋友分享好东西、友好互动、请客、夏日西瓜",
        "jp_text": "シェアします",
        "description": "真寻抱着半个大西瓜笑眯眯地说分你一半",
        "dimensions": "370x320"
    },
    {
        "id": "31",
        "filename": "31_甜蜜_品尝巧克力.png",
        "path": "/stickers/mahiro/31_甜蜜_品尝巧克力.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\31_甜蜜_品尝巧克力.png",
        "category": "节日甜蜜",
        "tags": [
            "巧克力",
            "圣诞",
            "甜美",
            "回味",
            "情人节"
        ],
        "scenario": "吃零食甜品、过圣诞/情人节、感受到甜甜的爱意",
        "jp_text": "",
        "description": "真寻戴圣诞帽品尝心形巧克力脸颊泛红回味",
        "dimensions": "370x320"
    },
    {
        "id": "32",
        "filename": "32_计划通_推眼镜奸笑.png",
        "path": "/stickers/mahiro/32_计划通_推眼镜奸笑.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\32_计划通_推眼镜奸笑.png",
        "category": "腹黑算计",
        "tags": [
            "计划通",
            "推眼镜",
            "奸笑",
            "搞事",
            "算计"
        ],
        "scenario": "想出了鬼点子、胜券在握、整蛊别人、露出坏笑",
        "jp_text": "にしし",
        "description": "真寻戴上黑框眼镜推着镜框发出奸笑",
        "dimensions": "370x320"
    },
    {
        "id": "33",
        "filename": "33_哲学_宇宙真寻升华.png",
        "path": "/stickers/mahiro/33_哲学_宇宙真寻升华.png",
        "local_path": "c:/Users/Hanako/WebstormProjects/zhenxun_webui/public/stickers/mahiro\\33_哲学_宇宙真寻升华.png",
        "category": "哲学思考",
        "tags": [
            "宇宙猫猫",
            "看透红尘",
            "升华",
            "哲学",
            "发呆"
        ],
        "scenario": "看破红尘、思索人生真谛、面对震撼事实彻底升华",
        "jp_text": "",
        "description": "真寻背景变为地球宇宙眼神宁静深邃看透一切",
        "dimensions": "370x320"
    }
];

export const STICKER_CATEGORIES = Array.from(new Set(MAHIRO_STICKERS.map((s) => s.category)));

const STICKER_ID_MAP = new Map<string, string>(
    MAHIRO_STICKERS.map((s) => [s.id, s.path]),
);

/** 根据 ID（如 "05" 或 "5"）或路径获取标准表情包 URL */
export function resolveStickerUrl(sticker: string): string {
    if (!sticker) return "";
    if (sticker.startsWith("/") || sticker.startsWith("http")) return sticker;
    const normalizedId = sticker.padStart(2, "0");
    const found = STICKER_ID_MAP.get(normalizedId);
    if (found) return found;
    return `/stickers/mahiro/${sticker}`;
}

const RAW_EMOJIS: { char: string; cat: string; tags: string[] }[] = [
    // 常用
    { char: "😀", cat: "常用", tags: ["开心", "笑"] },
    { char: "😂", cat: "常用", tags: ["笑哭", "爆笑"] },
    { char: "🤣", cat: "常用", tags: ["在地上打滚笑"] },
    { char: "😊", cat: "常用", tags: ["微笑", "温柔"] },
    { char: "🥰", cat: "常用", tags: ["喜欢", "爱意", "爱心"] },
    { char: "😍", cat: "常用", tags: ["色", "双眼放光", "心心"] },
    { char: "😘", cat: "常用", tags: ["亲亲", "飞吻"] },
    { char: "😋", cat: "常用", tags: ["调皮", "吐舌", "贪吃"] },
    { char: "😎", cat: "常用", tags: ["墨镜", "帅", "酷"] },
    { char: "🤔", cat: "常用", tags: ["思考", "沉思", "疑问"] },
    { char: "🤗", cat: "常用", tags: ["抱抱", "贴贴"] },
    { char: "🤩", cat: "常用", tags: ["崇拜", "眼冒金星"] },
    { char: "😭", cat: "常用", tags: ["大哭", "流泪", "难过"] },
    { char: "🥺", cat: "常用", tags: ["可怜", "求求", "汪汪眼"] },
    { char: "😳", cat: "常用", tags: ["害羞", "震惊", "大眼睛"] },
    { char: "😱", cat: "常用", tags: ["惊恐", "吓死"] },
    { char: "😡", cat: "常用", tags: ["生气", "红脸发怒"] },
    { char: "👍", cat: "常用", tags: ["点赞", "好", "强"] },
    { char: "👌", cat: "常用", tags: ["OK", "好的", "没问题"] },
    { char: "✌️", cat: "常用", tags: ["耶", "胜利", "剪刀手"] },
    { char: "🙏", cat: "常用", tags: ["合十", "拜托", "祈祷", "感谢"] },
    { char: "🎉", cat: "常用", tags: ["庆祝", "彩带", "好耶"] },
    { char: "🔥", cat: "常用", tags: ["火", "给力", "热门"] },
    { char: "❤️", cat: "常用", tags: ["红心", "爱", "喜欢"] },

    // 表情
    { char: "😃", cat: "表情", tags: ["笑"] },
    { char: "😄", cat: "表情", tags: ["大笑"] },
    { char: "😁", cat: "表情", tags: ["露齿笑"] },
    { char: "😆", cat: "表情", tags: ["闭眼笑"] },
    { char: "😅", cat: "表情", tags: ["汗", "尴尬笑"] },
    { char: "😉", cat: "表情", tags: ["眨眼"] },
    { char: "😇", cat: "表情", tags: ["天使", "纯洁"] },
    { char: "🙂", cat: "表情", tags: ["微笑", "淡淡的笑"] },
    { char: "🙃", cat: "表情", tags: ["倒立笑", "装疯卖傻"] },
    { char: "😜", cat: "表情", tags: ["吐舌眨眼", "做鬼脸"] },
    { char: "🤪", cat: "表情", tags: ["搞怪", "发癫"] },
    { char: "😝", cat: "表情", tags: ["吐舌紧闭眼"] },
    { char: "🤑", cat: "表情", tags: ["发财", "财迷", "钱"] },
    { char: "🤫", cat: "表情", tags: ["嘘", "保密", "小声"] },
    { char: "🤭", cat: "表情", tags: ["偷笑", "捂嘴"] },
    { char: "🤨", cat: "表情", tags: ["挑眉", "怀疑"] },
    { char: "😐", cat: "表情", tags: ["无语", "面无表情"] },
    { char: "😑", cat: "表情", tags: ["无语凝视"] },
    { char: "😶", cat: "表情", tags: ["没嘴", "沉默"] },
    { char: "😏", cat: "表情", tags: ["坏笑", "奸笑"] },
    { char: "😒", cat: "表情", tags: ["斜眼", "鄙视"] },
    { char: "🙄", cat: "表情", tags: ["翻白眼"] },
    { char: "😬", cat: "表情", tags: ["咬牙", "尴尬"] },
    { char: "🤥", cat: "表情", tags: ["匹诺曹", "说谎"] },
    { char: "😌", cat: "表情", tags: ["释怀", "欣慰"] },
    { char: "😔", cat: "表情", tags: ["沉思", "郁闷"] },
    { char: "😪", cat: "表情", tags: ["瞌睡", "流鼻涕"] },
    { char: "🤤", cat: "表情", tags: ["流口水", "馋"] },
    { char: "😴", cat: "表情", tags: ["睡觉", "困"] },
    { char: "😷", cat: "表情", tags: ["口罩", "生病"] },
    { char: "🤒", cat: "表情", tags: ["发烧", "体温计"] },
    { char: "🤕", cat: "表情", tags: ["受伤", "绷带"] },
    { char: "🤢", cat: "表情", tags: ["恶心", "想吐"] },
    { char: "🤮", cat: "表情", tags: ["呕吐"] },
    { char: "🤧", cat: "表情", tags: ["打喷嚏", "感冒"] },
    { char: "🥵", cat: "表情", tags: ["好热", "热"] },
    { char: "🥶", cat: "表情", tags: ["好冷", "冷"] },
    { char: "🥴", cat: "表情", tags: ["晕乎乎", "喝多"] },
    { char: "😵", cat: "表情", tags: ["晕眩"] },
    { char: "🤯", cat: "表情", tags: ["脑袋炸裂", "震惊"] },
    { char: "🥳", cat: "表情", tags: ["派对", "庆祝吹哨"] },
    { char: "🤡", cat: "表情", tags: ["小丑", "竟是我自己"] },
    { char: "👻", cat: "表情", tags: ["幽灵", "鬼魂"] },
    { char: "💀", cat: "表情", tags: ["骷髅", "笑死"] },
    { char: "👽", cat: "表情", tags: ["外星人"] },
    { char: "🤖", cat: "表情", tags: ["机器人"] },
    { char: "💩", cat: "表情", tags: ["便便"] },

    // 手势
    { char: "👎", cat: "手势", tags: ["踩", "不行", "差劲"] },
    { char: "👊", cat: "手势", tags: ["出拳", "拳头"] },
    { char: "✊", cat: "手势", tags: ["加油", "握拳"] },
    { char: "🤛", cat: "手势", tags: ["碰拳左"] },
    { char: "🤜", cat: "手势", tags: ["碰拳右"] },
    { char: "🤞", cat: "手势", tags: ["祝好运", "祈愿"] },
    { char: "🤟", cat: "手势", tags: ["我爱你", "摇滚"] },
    { char: "🤘", cat: "手势", tags: ["金属摇滚"] },
    { char: "🤙", cat: "手势", tags: ["打电话", "666"] },
    { char: "👈", cat: "手势", tags: ["向左", "看左边"] },
    { char: "👉", cat: "手势", tags: ["向右", "看右边"] },
    { char: "👆", cat: "手势", tags: ["向上", "楼上"] },
    { char: "👇", cat: "手势", tags: ["向下", "楼下"] },
    { char: "☝️", cat: "手势", tags: ["第一", "注意"] },
    { char: "✋", cat: "手势", tags: ["击掌", "暂停"] },
    { char: "🤚", cat: "手势", tags: ["手背"] },
    { char: "🖐️", cat: "手势", tags: ["张开手掌", "五"] },
    { char: "🖖", cat: "手势", tags: ["瓦肯举手礼"] },
    { char: "👋", cat: "手势", tags: ["挥手", "拜拜", "再见"] },
    { char: "🤝", cat: "手势", tags: ["握手", "合作"] },
    { char: "👏", cat: "手势", tags: ["鼓掌", "鼓掌鼓掌"] },
    { char: "🙌", cat: "手势", tags: ["举双手", "好耶"] },
    { char: "👐", cat: "手势", tags: ["摊手"] },
    { char: "🤲", cat: "手势", tags: ["双手托起"] },
    { char: "💪", cat: "手势", tags: ["肌肉", "给力", "强壮"] },

    // 爱心与庆祝
    { char: "🧡", cat: "心与庆祝", tags: ["橙心"] },
    { char: "💛", cat: "心与庆祝", tags: ["黄心"] },
    { char: "💚", cat: "心与庆祝", tags: ["绿心"] },
    { char: "💙", cat: "心与庆祝", tags: ["蓝心"] },
    { char: "💜", cat: "心与庆祝", tags: ["紫心"] },
    { char: "🖤", cat: "心与庆祝", tags: ["黑心"] },
    { char: "🤍", cat: "心与庆祝", tags: ["白心"] },
    { char: "💔", cat: "心与庆祝", tags: ["心碎", "心痛"] },
    { char: "❤️‍🔥", cat: "心与庆祝", tags: ["燃烧的心", "热情"] },
    { char: "💕", cat: "心与庆祝", tags: ["两颗心"] },
    { char: "💞", cat: "心与庆祝", tags: ["旋转的心"] },
    { char: "💓", cat: "心与庆祝", tags: ["跳动的心"] },
    { char: "💗", cat: "心与庆祝", tags: ["成长的心"] },
    { char: "💖", cat: "心与庆祝", tags: ["闪亮的心"] },
    { char: "💘", cat: "心与庆祝", tags: ["一箭穿心"] },
    { char: "✨", cat: "心与庆祝", tags: ["闪烁", "星星", "闪亮"] },
    { char: "⭐", cat: "心与庆祝", tags: ["星", "五角星"] },
    { char: "🌟", cat: "心与庆祝", tags: ["闪耀的星"] },
    { char: "💥", cat: "心与庆祝", tags: ["爆炸", "撞击"] },
    { char: "🎊", cat: "心与庆祝", tags: ["彩球", "庆祝"] },
    { char: "🎈", cat: "心与庆祝", tags: ["气球"] },
    { char: "🎂", cat: "心与庆祝", tags: ["蛋糕", "生日快乐"] },
    { char: "🎁", cat: "心与庆祝", tags: ["礼物", "惊喜"] },
    { char: "🏆", cat: "心与庆祝", tags: ["奖杯", "冠军"] },

    // 生活与日用
    { char: "☕", cat: "生活", tags: ["咖啡", "热饮"] },
    { char: "🍵", cat: "生活", tags: ["茶", "绿茶"] },
    { char: "🧃", cat: "生活", tags: ["饮料", "果汁"] },
    { char: "🍺", cat: "生活", tags: ["啤酒", "干杯"] },
    { char: "🍻", cat: "生活", tags: ["碰杯", "干杯"] },
    { char: "🍔", cat: "生活", tags: ["汉堡", "汉堡包"] },
    { char: "🍟", cat: "生活", tags: ["薯条"] },
    { char: "🍕", cat: "生活", tags: ["披萨"] },
    { char: "🍜", cat: "生活", tags: ["拉面", "面条"] },
    { char: "🍣", cat: "生活", tags: ["寿司"] },
    { char: "🍦", cat: "生活", tags: ["冰淇淋", "雪糕"] },
    { char: "🍰", cat: "生活", tags: ["小蛋糕", "甜品"] },
    { char: "🍉", cat: "生活", tags: ["西瓜"] },
    { char: "🍓", cat: "生活", tags: ["草莓"] },
    { char: "💻", cat: "生活", tags: ["电脑", "笔记本", "写代码"] },
    { char: "🎮", cat: "生活", tags: ["游戏手柄", "打游戏"] },
    { char: "💡", cat: "生活", tags: ["灵感", "灯泡", "想法"] },
    { char: "🚀", cat: "生活", tags: ["火箭", "起飞", "神速"] }
];

export const DEFAULT_EMOJI_PACK: StickerPack = {
    id: "default-emoji",
    name: "默认表情",
    icon: "Smile",
    iconType: "icon",
    type: "emoji",
    description: "经典日常 Emoji 表情合集",
    categories: ["全部", "常用", "表情", "手势", "心与庆祝", "生活"],
    stickers: RAW_EMOJIS.map((e, idx) => ({
        id: `emoji-${idx}`,
        name: e.char,
        path: e.char,
        type: "emoji",
        category: e.cat,
        tags: [e.cat, ...e.tags],
        description: e.char,
    })),
};

export const MAHIRO_STICKER_PACK: StickerPack = {
    id: "mahiro",
    name: "绪山真寻",
    icon: "/stickers/mahiro/11_卖萌_猫耳喵呜.png",
    iconType: "image",
    type: "image",
    description: "《别当欧尼酱了！》绪山真寻官方透明底高清表情包",
    categories: ["全部", ...STICKER_CATEGORIES],
    stickers: MAHIRO_STICKERS.map((s) => ({
        ...s,
        name: s.filename.replace(/^\d+_/, "").replace(".png", ""),
        type: "image",
    })),
};

/** 全局表情包列表（QQ式多包切换架构，支持未来动态接入新包） */
export const STICKER_PACKS: StickerPack[] = [
    QQ_DEFAULT_STICKER_PACK,
    MAHIRO_STICKER_PACK,
];

export function getStickerPack(id: string): StickerPack | undefined {
    return STICKER_PACKS.find((p) => p.id === id);
}

