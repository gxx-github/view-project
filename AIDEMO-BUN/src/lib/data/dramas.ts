// 甜剧数据库 — 模拟真实数据库，用于 Agent 工具查询

export interface DramaRecord {
  id: number;
  title: string;
  year: number;
  genre: string[];
  sweetness: number; // 1-5
  rating: number;    // 1-10
  episodes: number;
  platform: string;
  description: string;
  noAbuse: boolean;  // 无虐
}

export const DRAMA_DB: DramaRecord[] = [
  // 2024
  { id: 1, title: "在暴雪时分", year: 2024, genre: ["高甜", "纯爱", "运动"], sweetness: 5, rating: 8.1, episodes: 30, platform: "优酷", description: "台球天才与九球少女的甜蜜邂逅，双向奔赴超甜", noAbuse: true },
  { id: 2, title: "你也有今天", year: 2024, genre: ["高甜", "职场", "搞笑"], sweetness: 4, rating: 7.5, episodes: 36, platform: "优酷", description: "律师男女主从欢喜冤家到甜蜜恋爱", noAbuse: true },
  { id: 3, title: "祈今朝", year: 2024, genre: ["高甜", "古装", "仙侠"], sweetness: 4, rating: 7.8, episodes: 36, platform: "腾讯视频", description: "仙侠世界的甜蜜纠葛，颜值演技双在线", noAbuse: false },
  // 2023
  { id: 4, title: "偷偷藏不住", year: 2023, genre: ["高甜", "青春", "纯爱"], sweetness: 5, rating: 8.3, episodes: 25, platform: "优酷", description: "暗恋成真的甜蜜故事，赵露思甜到冒泡", noAbuse: true },
  { id: 5, title: "长月烬明", year: 2023, genre: ["先虐后甜", "古装", "仙侠"], sweetness: 3, rating: 7.6, episodes: 40, platform: "优酷", description: "虐到心碎后甜到飞起，罗云熙白鹿演技炸裂", noAbuse: false },
  { id: 6, title: "莲花楼", year: 2023, genre: ["悬疑", "古装", "治愈"], sweetness: 3, rating: 8.5, episodes: 40, platform: "爱奇艺", description: "断案+江湖+治愈，节奏紧凑不无聊", noAbuse: true },
  { id: 7, title: "消失的十一层", year: 2023, genre: ["高甜", "现代", "悬疑"], sweetness: 4, rating: 7.2, episodes: 24, platform: "爱奇艺", description: "悬疑外壳下包裹的甜蜜恋爱", noAbuse: true },
  { id: 8, title: "护心", year: 2023, genre: ["高甜", "古装", "搞笑"], sweetness: 4, rating: 7.4, episodes: 40, platform: "优酷", description: " dragon与人族少女的爆笑甜蜜日常", noAbuse: true },
  // 2022
  { id: 9, title: "苍兰诀", year: 2022, genre: ["高甜", "古装", "仙侠"], sweetness: 5, rating: 8.1, episodes: 36, platform: "爱奇艺", description: "年度甜剧天花板，虞书欣王鹤棣超甜", noAbuse: false },
  { id: 10, title: "星汉灿烂", year: 2022, genre: ["先虐后甜", "古装"], sweetness: 4, rating: 7.9, episodes: 56, platform: "腾讯视频", description: "赵露思吴磊主演，古装宅斗+甜蜜爱情", noAbuse: false },
  { id: 11, title: "一闪一闪亮星星", year: 2022, genre: ["高甜", "青春", "纯爱"], sweetness: 5, rating: 8.0, episodes: 24, platform: "爱奇艺", description: "穿越时空的双向奔赴，甜到心坎里", noAbuse: true },
  { id: 12, title: "炽道", year: 2022, genre: ["高甜", "运动", "纯爱"], sweetness: 4, rating: 7.8, episodes: 30, platform: "优酷", description: "田径场上的甜蜜恋爱，又燃又甜", noAbuse: true },
  { id: 13, title: "余生请多指教", year: 2022, genre: ["高甜", "治愈", "职场"], sweetness: 5, rating: 7.5, episodes: 30, platform: "腾讯视频", description: "肖战杨紫主演，医生与音乐人的治愈系爱情", noAbuse: true },
  // 2021
  { id: 14, title: "你是我的荣耀", year: 2021, genre: ["高甜", "纯爱", "职场"], sweetness: 5, rating: 8.2, episodes: 32, platform: "腾讯视频", description: "航天工程师与明星的甜蜜重逢，杨洋迪丽热巴", noAbuse: true },
  { id: 15, title: "司藤", year: 2021, genre: ["高甜", "悬疑", "古装"], sweetness: 4, rating: 7.7, episodes: 30, platform: "优酷", description: "傲娇司藤与忠犬秦放，又甜又飒", noAbuse: true },
  { id: 16, title: "锦心似玉", year: 2021, genre: ["先虐后甜", "古装"], sweetness: 3, rating: 7.3, episodes: 45, platform: "腾讯视频", description: "宅斗权谋中的甜蜜爱情", noAbuse: false },
  { id: 17, title: "爱上特种兵", year: 2021, genre: ["高甜", "职场", "纯爱"], sweetness: 4, rating: 7.1, episodes: 43, platform: "爱奇艺", description: "特种兵与医生的甜蜜日常", noAbuse: true },
  // 2020
  { id: 18, title: "致我们甜甜的小美满", year: 2020, genre: ["高甜", "校园", "治愈"], sweetness: 5, rating: 7.6, episodes: 27, platform: "腾讯视频", description: "校园恋爱甜到齁，法医与网文作家的双向暗恋", noAbuse: true },
  { id: 19, title: "琉璃", year: 2020, genre: ["先虐后甜", "古装", "仙侠"], sweetness: 4, rating: 8.0, episodes: 59, platform: "优酷", description: "十生十世的虐恋与救赎，虐完超甜", noAbuse: false },
  { id: 20, title: "传闻中的陈芊芊", year: 2020, genre: ["高甜", "古装", "搞笑"], sweetness: 5, rating: 7.5, episodes: 24, platform: "腾讯视频", description: "穿进剧本的爆笑甜蜜之旅，轻松解压首选", noAbuse: true },
  { id: 21, title: "我真的很喜欢你", year: 2020, genre: ["高甜", "职场", "纯爱"], sweetness: 4, rating: 7.0, episodes: 24, platform: "优酷", description: "总裁与元气少女的甜蜜日常", noAbuse: true },
  // 2019
  { id: 22, title: "亲爱的热爱的", year: 2019, genre: ["高甜", "纯爱", "竞技"], sweetness: 5, rating: 8.1, episodes: 41, platform: "爱奇艺", description: "电竞大神与天才少女，国民甜剧", noAbuse: true },
  { id: 23, title: "陈情令", year: 2019, genre: ["古装", "仙侠", "治愈"], sweetness: 3, rating: 8.2, episodes: 50, platform: "腾讯视频", description: "知己情深的仙侠经典，治愈系", noAbuse: true },
  { id: 24, title: "世界欠我一个初恋", year: 2019, genre: ["高甜", "职场", "搞笑"], sweetness: 4, rating: 7.2, episodes: 24, platform: "爱奇艺", description: "职场轻喜剧，总裁与实习生的甜蜜碰撞", noAbuse: true },
  // 2018
  { id: 25, title: "致我们单纯的小美好", year: 2018, genre: ["高甜", "校园", "纯爱"], sweetness: 5, rating: 8.2, episodes: 23, platform: "腾讯视频", description: "校园甜剧鼻祖，江辰陈小希甜蜜到骨子里", noAbuse: true },
  { id: 26, title: "香蜜沉沉烬如霜", year: 2018, genre: ["先虐后甜", "古装", "仙侠"], sweetness: 4, rating: 8.0, episodes: 63, platform: "优酷", description: "虐恋情深但结局超甜，杨紫演技巅峰", noAbuse: false },
  { id: 27, title: "双世宠妃", year: 2018, genre: ["高甜", "古装", "搞笑"], sweetness: 5, rating: 7.4, episodes: 24, platform: "腾讯视频", description: "穿越甜宠剧鼻祖，八王爷宠妻狂魔", noAbuse: true },
  { id: 28, title: "夜空中最闪亮的星", year: 2018, genre: ["高甜", "职场", "纯爱"], sweetness: 4, rating: 7.1, episodes: 30, platform: "腾讯视频", description: "明星与助理的甜蜜日常", noAbuse: true },
  // 2017
  { id: 29, title: "致我们暖暖的小时光", year: 2017, genre: ["高甜", "校园", "治愈"], sweetness: 5, rating: 8.1, episodes: 24, platform: "腾讯视频", description: "物理天才与会计系女生的甜蜜同居日常", noAbuse: true },
  { id: 30, title: "三生三世十里桃花", year: 2017, genre: ["先虐后甜", "古装", "仙侠"], sweetness: 4, rating: 8.0, episodes: 58, platform: "优酷", description: "三生三世的爱情纠葛，虐完超治愈", noAbuse: false },
  // 经典
  { id: 31, title: "微微一笑很倾城", year: 2016, genre: ["高甜", "校园", "纯爱"], sweetness: 5, rating: 7.9, episodes: 30, platform: "优酷", description: "网游到现实的甜蜜恋爱，杨洋郑爽经典之作", noAbuse: true },
  { id: 32, title: "花千骨", year: 2015, genre: ["先虐后甜", "古装", "仙侠"], sweetness: 3, rating: 8.1, episodes: 50, platform: "爱奇艺", description: "师徒虐恋的经典，赵丽颖封神之作", noAbuse: false },
  { id: 33, title: "杉杉来了", year: 2014, genre: ["高甜", "职场", "搞笑"], sweetness: 5, rating: 7.8, episodes: 34, platform: "爱奇艺", description: "赵丽颖张翰经典甜宠，霸总与吃货的甜蜜日常", noAbuse: true },
];
