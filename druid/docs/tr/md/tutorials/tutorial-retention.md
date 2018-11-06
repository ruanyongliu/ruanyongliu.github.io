本章节介绍如何给一个数据源配置保留规则，来设置各时间段的数据是保留还是删除。

我们假设你已经在你本地机器下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid。

完成 [教程：加载文件](#!/tutorials/tutorial-batch) 和 [教程：查询数据](#!/tutorials/tutorial-query) 的阅读会更有帮助。
### 加载样例数据
本章节，我们会使用维基修改数据作为样例数据，和一个导入任务配置来给每个小时的输入数据分别创建segment。

导入配置在`examples/retention-index.json`。提交这个配置，创建一个叫`retention-tutorial`的datasource。
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/retention-index.json http://localhost:8090/druid/indexer/v1/task
```
导入完成后，到 http://localhost:8081 访问Coordinator控制台。

在控制台，在页面顶端登进datasources标签页。

这个标签页展示了可用的datasource，和每一个datasource的保留规则的总结。

![](http://druid.io/docs/0.12.3/tutorials/img/tutorial-retention-00.png)
目前`retention-tutorial`datasource没有设置保留规则的设置。因此这里使用的默认规则`load Forever 2 in _default_tier`。

表示所有数据都会被加载，不管什么时间，并且每一个segment会在默认层级里被复制到两个节点里。

本章节我们会忽略分层和冗余概念。

我们点击左边的`retention-tutorial`datasource。

跳到下一页( http://localhost:8081/#/datasources/retention-tutorial )，展示了datasource包含了那些segment。这里在页面左边展示了总共有24个segment，分别包含了2015-09-12每小时的数据。

![](http://druid.io/docs/0.12.3/tutorials/img/tutorial-retention-01.png)
### 配置保留规则
假设我们想丢掉2015-09-12前12个小时，保留后12个小时的数据。

点击在页面左上角，铅笔状图标的`edit rule`按钮。

会弹出一个规则配置窗口。在用户和修改日志注释字段输入`tutorial`。

点击`+ Add a rule`按钮两次。

在顶部`rule #1`输入框，点击`Load`，`Interval`，在`interval`输入框输入`2015-09-12T12:00:00.000Z/2015-09-13T00:00:00.000Z`，点击`+ _default_tier replicant`。

底部`rule #2`输入框，点击`Drop`和`Forever`。

配置好的规则应该长这样:

![](http://druid.io/docs/0.12.3/tutorials/img/tutorial-retention-02.png)

点击`Save all rules`, 等几秒钟之后刷新页面。

2015-09-12头12小时的segment应该就没有了:

![](http://druid.io/docs/0.12.3/tutorials/img/tutorial-retention-03.png)

实际结果的保留规则链是这样的：
- loadByInterval 2015-09-12T12/2015-09-13 (12 hours)
- dropForever
- loadForever (默认规则)

规则链从上到下执行，因此在最底部加一条默认规则。

如果数据在特定12小时内，这个我们刚创建的规则链会加载他。

如果数据不在后12小时时间段，规则链执行下一步的dropForever，删除掉这些数据。

dropForever终结了这个规则链，有效地覆盖了默认的loadForever规则，因此这个规则在这个规则链是不会到达的。

注意本章节我们定义了一个在特定时间段的加载规则。

如果你想配置的是根据时间的存在时间(例：保留过去3个月的数据)保留数据，应该定义一个`Period`加载规则。
### 更多
[加载规则](/TODO)
