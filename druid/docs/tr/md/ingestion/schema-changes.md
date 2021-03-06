datasource允许随时更改结构，支持不同结构的segment同时存在。

### 替换segment
Druid使用**datasource名称**，**时间段**，**版本**加上**分区号**作为唯一标记符。分区号只有那些多个落在一个时间维度上的segment才有。例如你有一份按小时粒度的segment配置，但是一个小时的数据量很大，单个segment放不下，因此你可以在一个小时创建多个segment。这个segment包含相同的datasource，时间段，版本，但各自包含一个线性增长的分区号。
```
foo_2015-01-01/2015-01-02_v1_0
foo_2015-01-01/2015-01-02_v1_1
foo_2015-01-01/2015-01-02_v1_2
```

在上面的例子中，datasource等于`foo`，时间段等于`2015-01-01/2015-01-02`，版本号等于`v1`，分区号等于`0`。如果之后你使用一个新结构重新导入的你数据，新创建的segment将带上一个更大的版本号。
```
foo_2015-01-01/2015-01-02_v2_0
foo_2015-01-01/2015-01-02_v2_1
foo_2015-01-01/2015-01-02_v2_2
```

Druid批处理索引(基于Hadoop或者索引任务)逐个时间间隔地保证原子更新操作。在上面的例子中，直到在`2015-01-01/2015-01-02`上的所有`v2`的segment加载进Druid集群，查询才会把`v1`的segment排除掉。一旦所有`v2`的segment加载完毕，能被查询，所有的查询就会忽略`v1`的segment，替换成`v2`的segment。在一段时间之后`v1`segment将会从集群被删掉。

注意跨时间段的更新，只是每个时间段各自保证原子性，而不是整段保证原子性。例如：
```
foo_2015-01-01/2015-01-02_v1_0
foo_2015-01-02/2015-01-03_v1_1
foo_2015-01-03/2015-01-04_v1_2
```

`v2`版本的segment在构建完会立即被加载到集群，替换掉重叠时间段的`v1`的segment。在`v2`segment全部完成加载之间，集群上可能包含一份`v1`和`v2`混合的segment。
```
foo_2015-01-01/2015-01-02_v1_0
foo_2015-01-02/2015-01-03_v2_1
foo_2015-01-03/2015-01-04_v1_2
```
此时查询也可能会命中`v1`和`v2`混合的segment。

### 不同结构的segment
一个datasource可能包含不同结构的Druid segment。如果有两个不同结构的segment，其中一个字符串列(维度)只存在其中一个不在另外一个，涉及到两个的segment的查询仍然有效。如果segment没有包含查询的维度，Druid会视为这个维度在这个segment的值是null。相似地，如果一个segment包含一个数字型的数据列(指标)，另外一个没有，查询在缺失该指标的segment会"做正确的事`do the right thing`"。作用在这个缺失指标的聚合器表现为这个指标本来就没有。

