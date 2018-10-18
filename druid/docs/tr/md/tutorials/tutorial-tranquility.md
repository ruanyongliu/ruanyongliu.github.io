### 开始

本教程介绍如何通过Tranquility服务使用HTTP把流式数据推送到Druid。  
[Tranquility服务](https://github.com/druid-io/tranquility/blob/master/docs/server.md)允许使用HTTP POST把一个数据流推送到Druid。  
我们假设你已经下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid服务。你暂不需要再加载任何数据

### 下载Tranquility
在Druid包根目录执行下面的命令:
```
curl http://static.druid.io/tranquility/releases/tranquility-distribution-0.8.2.tgz -o tranquility-distribution-0.8.2.tgz
tar -xzf tranquility-distribution-0.8.2.tgz
cd tranquility-distribution-0.8.2
```

### 执行Tranquility服务
执行:
```
bin/tranquility server -configFile ../examples/conf/tranquility/wikipedia-server.json -Ddruid.extensions.loadList=[]
```

### 发送数据
发送维基的修改样例到Tranquility:
```
curl -XPOST -H'Content-Type: application/json' --data-binary @quickstart/wikiticker-2015-09-12-sampled.json http://localhost:8200/v1/post/wikipedia
```
期望输出:
```
{"result":{"received":39244,"sent":39244}}
```
这表示HTTP服务从你这里收到了39,244项事件，和发了39,244项到Druid。如果刚打开Tranquility Server不久就非常快的执行这个命令，可能会返回一个`connection refused`错误，也就是说服务可能还没完全启动。应该让他启动一会。这条命令还可能在第一次执行的时候运行得久一点，这是因为这段时间Druid在找导入任务资源。一旦完成，后续的POST请求就会非常快地完成。  
数据发送到Druid之后，你就能马上查询。
如果你发现请求返回`sent`的值为0，重新发送，直到`sent`的值也是39,244
```
{"result":{"received":39244,"sent":0}}
```

### 查询数据
一到两分钟之后你的数据应该能完全可用了。你可以通过Coordinator控制台http://localhost:8081/#/ 监控这个过程。  
一旦数据加载完毕，请查看[查询教程](#!/tutorials/tutorial-query)来对新加载的数据执行一些查询。

### 清理
如果你希望继续其他导入教程，你需要[重置集群](#!/tutorials#resetting-cluster-state)，因为其他教程也会写到这个`wikipedia`datasource。

### 更多
更多Tranquility信息，请浏览[Tranquility文档](/TODO)

