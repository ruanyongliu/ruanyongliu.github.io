任务运行在MiddleManager，一般只处理一个单一的数据源。  
任务通过发送一个POST请求给Overlord。API详细介绍请浏览[Overlord任务API](/TODO)  
总共有下面几类任务。
### segment创建任务
#### 本地批处理Indexing任务
[详情](/TODO)
#### Hadoop Indexing任务
[详情](/TODO)
#### Kafka Indexing任务
Kafka Supervisor会自动创建Indexing任务，负责从Kafka流拉取数据。这类任务不是由用户创建/提交的。详情请阅读[Kafka Indexing服务](/TODO)。
#### 流式推送任务(Tranquility)
Tranquility服务会自动创建一个实时任务，使用一个[EventReceiverFirehose](/TODO)接受来自HTTP的事件。这类任务不是由用户创建/提交的。详情请阅读[Tranquility流式推送](/TODO)。

### 压缩任务
压缩任务合并给定时间段的所有segment。详情请阅读[压缩](/TODO)。

### segment合并任务
<div class="alert alert-info" role="alert">
追加、合并和相同时间段合并任务的文档统一移到了[其他任务文档](/TODO)。
</div>

### Kill任务
Kill任务删除一个segment的所有信息，并且从深度存储中移除。详情请阅读[删除数据](/TODO)。

### 其他任务
[详情](/TODO)

### 任务锁和优先级
[详情](/TODO)
