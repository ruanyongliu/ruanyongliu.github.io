本章旨在帮助用户设计一个用于导入的Druid的数据结构。Druid接收的非规范化数据，一般有三种类型的数据列，时间戳、维度或者一个测量值`measure`(或者Druid里所说的指标`metric`/聚合器`aggregator`)。这也遵循OLAP数据的[标准命名约定](https://en.wikipedia.org/wiki/Online_analytical_processing#Overview_of_OLAP_systems)。  
具体来说：
- 每行Druid数据都有一个时间戳。数据一般按照时间分区，每个查询也都有一个时间的过滤。查询结果也按照时间粒度如分钟、小时、天等等分段。
- 维度是可以被过滤或者分组的字段。他们通常是单个字符串，字符串数组，单个整数、单个双精度浮点数或者单个单精度浮点数。
- 指标是可以被聚合计算的的字段。他们通常被被存储为数字(整数或浮点)，也可以存储为更复杂的对象，如HyperLogLog草图或者近似直方图草图。

一般的线上表(或者Druid里的datasource)大概有不到100个维度和不到100个指标。虽然基于用户的需求，创建数千个维度的datasource也是可以的。  
下面我们介绍一些结构定义的最佳实践方案：

### 数字型维度
如果用户希望导入一个数字型维度如`Long`、`Double`或者`Float`，首先需要在`dimension`的`dimensionsSpec`配置项声明，否则会默认为字符串类型导入。  
字符串和数字型的列在性能上需要权衡。数字型的列在分组的效率上一般更快。但是跟字符串不一样的是，数字型没有索引，因此在过滤的时间会更慢。  
详情请阅读[维度结构](#!/ingestion/ingestion-spec#dimension-schema)

### 高基数维度(如唯一ID)
事实上我们发现唯一ID的精确计数一般是不需要的。存储唯一ID会使roll-up失效和影响压缩。相反，存储能一份唯一ID的草图，和这些草图结果继续的聚合会更好地提高性能(数量级的性能提升)，和显著的存储量减少。Druid的`hyperUnique`基于[HyperLogLog](https://www.youtube.com/watch?v=Hpd3f_MLdXo)算法，用于计算高基维度不同个数的数量。

### 嵌套的维度
截止到写这篇文档为止，Druid还不支持嵌套维度。嵌套维度需要被展开，例如如果你有下列形式的数据：
```
{"foo":{"bar": 3}}
```
导入前你需要转换成:
```
{"foo_bar": 3}
```
Druid支持展开json输出数据，详情请阅读[展开JSON数据](/TODO)。

### 导入事件的数据量计数
`count`聚合器允许数据在导入时计算导入事件的数量。但是重要是查询这个指标要改使用`longSum`聚合器。然后查询结果就有一个`count`聚合器返回时间段内Druid的数据行数，可以用于观察roll-up的程度。  
例如，如果你有一个导入配置，包含：
```
...
"metricsSpec" : [
      {
        "type" : "count",
        "name" : "count"
      },
...
```
查询导入行数：
```
...
"aggregations": [
    { "type": "longSum", "name": "numIngestedEvents", "fieldName": "count" },
...
```
### 无结构定义的维度
如果导入配置维度字段留空白，Druid会将非时间戳、不在维度排除字段、非指标列的剩下所有列视为维度。注意到由于[#658](https://github.com/druid-io/druid/issues/658)，此时segment的大小会比按字典顺序显示声明列时候的segment要大。但是这个限制只是存储上的问题，不会影响查询的正确性。  
注意使用非结构定义的维度都会被认为是字符串类型。

### 包含一个既是维度也是指标的列
包含唯一ID的工作流，可以一边过滤一个特定ID，同时对ID统计基数。如果你没有使用非结构定义维度，可以通过在设置成与维度不同名称的指标来支持这个场景。如果使用的是非结构定义维度，最好的处理方法是包含同一列复制成两列，一列是维度，一列是`hyperUnique`指标。这可能会需要一点ETL时间。  
例如，对于非结构定义维度，一列复制成两列：
```
{"device_id_dim":123, "device_id_met":123}
```
维度定义：
```
{ "type" : "hyperUnique", "name" : "devices", "fieldName" : "device_id_met" }
```
`device_id_dim`自动被视为维度。

