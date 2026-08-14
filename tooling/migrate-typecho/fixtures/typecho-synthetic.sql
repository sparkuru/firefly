CREATE TABLE `typecho_contents` (
  `cid` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `created` int NOT NULL,
  `modified` int NOT NULL,
  `text` longtext NOT NULL,
  `order` int NOT NULL,
  `authorId` int NOT NULL,
  `template` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `status` varchar(16) NOT NULL,
  `password` varchar(32) NOT NULL,
  `commentsNum` int NOT NULL,
  `allowComment` char(1) NOT NULL,
  `allowPing` char(1) NOT NULL,
  `allowFeed` char(1) NOT NULL,
  `parent` int NOT NULL,
  `views` int NOT NULL,
  `stars` int NOT NULL
);
INSERT INTO `typecho_contents` VALUES
(11,'First Synthetic Post','first-post',1704067200,1704153600,'<!--markdown-->\nFirst authored paragraph for the fallback that is not used.\n\n<center><span><img src="/usr/uploads/picture.png"></span></center>',0,1,'','post','publish','',1,'1','1','1',0,20,2),
(12,'Second Synthetic Post','second-post',1704240000,1704240000,'<!--markdown-->\nSecond authored paragraph becomes the derived description.\n\n```txt\nsynthetic\n```',0,1,'','post','publish','',0,'1','1','1',0,0,0),
(13,'About Fixture','about',1704326400,1704326400,'<!--markdown-->\n<div><p><b>About</b> this entirely synthetic fixture.</p></div>',0,1,'cross.php','page','publish','',0,'1','1','1',0,0,0);

CREATE TABLE `typecho_metas` (`mid` int NOT NULL, `name` varchar(200) NOT NULL, `slug` varchar(200) NOT NULL, `type` varchar(32) NOT NULL, `description` text NOT NULL, `count` int NOT NULL, `order` int NOT NULL, `parent` int NOT NULL);
INSERT INTO `typecho_metas` VALUES
(21,'Engineering','engineering','category','Synthetic category.',2,0,0),
(22,'Migration','migration','tag','Synthetic tag.',1,0,0);

CREATE TABLE `typecho_relationships` (`cid` int NOT NULL, `mid` int NOT NULL);
INSERT INTO `typecho_relationships` VALUES (11,21),(11,22),(12,21);

CREATE TABLE `typecho_fields` (`cid` int NOT NULL, `name` varchar(200) NOT NULL, `type` varchar(8) NOT NULL, `str_value` text, `int_value` int, `float_value` float);
INSERT INTO `typecho_fields` VALUES
(11,'customSummary','str','A reviewed synthetic summary.',0,0),
(11,'thumb','str','/usr/uploads/picture.png',0,0),
(12,'customSummary','str','',0,0),
(99,'customSummary','str','Orphaned synthetic value.',0,0),
(99,'unknownThemeField','str','Ignored synthetic value.',0,0);

CREATE TABLE `typecho_comments` (`coid` int NOT NULL, `cid` int NOT NULL, `created` int NOT NULL, `author` varchar(200) NOT NULL, `authorId` int NOT NULL, `ownerId` int NOT NULL, `mail` varchar(200) NOT NULL, `url` varchar(200) NOT NULL, `ip` varchar(64) NOT NULL, `agent` varchar(200) NOT NULL, `text` text NOT NULL, `type` varchar(16) NOT NULL, `status` varchar(16) NOT NULL, `parent` int NOT NULL);
INSERT INTO `typecho_comments` VALUES (31,11,1704412800,'Synthetic Reader',0,1,'','','','','Synthetic private handoff text.','comment','approved',0);

CREATE TABLE `typecho_users` (`uid` int NOT NULL, `name` varchar(200) NOT NULL, `password` varchar(200) NOT NULL, `mail` varchar(200) NOT NULL, `url` varchar(200) NOT NULL, `screenName` varchar(200) NOT NULL, `created` int NOT NULL, `activated` int NOT NULL, `logged` int NOT NULL, `group` varchar(32) NOT NULL, `authCode` varchar(200) NOT NULL);
INSERT INTO `typecho_users` VALUES (1,'synthetic-owner','','','','Synthetic Owner',0,0,0,'administrator','');

CREATE TABLE `Notes` (`id` varchar(64) NOT NULL, `ownerId` varchar(64), `lastChangeUserId` varchar(64), `title` text, `content` longtext, `alias` varchar(200), `permission` varchar(32), `createdAt` varchar(64), `updatedAt` varchar(64), `deletedAt` varchar(64));
INSERT INTO `Notes` VALUES
('memo-a','owner-a','editor-a','Synthetic memo','Private synthetic memo body.','memo-a','protected','2024-01-01T00:00:00.000Z','2024-01-02T00:00:00.000Z',NULL),
('memo-b','owner-a','editor-b','Deleted synthetic memo','Private deleted synthetic memo body.','memo-b','private','2024-01-03T00:00:00.000Z','2024-01-04T00:00:00.000Z','2024-01-05T00:00:00.000Z');
