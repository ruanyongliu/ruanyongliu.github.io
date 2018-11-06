这一章说的是如何更新现有数据，包括重写和添加。

我们假设你已经在你本地机器下载安装了之前在[quickstart章节](#!/tutorials)介绍Druid。

完成 [教程：加载文件](#!/tutorials/tutorial-batch)、[教程：查询数据](#!/tutorials/tutorial-query) 和 [教程：Rollup](#!/tutorials/tutorial-rollup) 的阅读会更有帮助。

### 重写
这一节会介绍如何重写一段已经存在的某个时间段的数据。
#### 加载初始数据
让我们先加载一份初始数据集用于之后的重写和添加。

这个教程用到的配置放在了`examples/updates-init-index.json`。这份配置从`examples/updates-data.json`输入文件那创建一个名叫`updates-tutorial`的datasource。
提交任务：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/updates-init-index.json http://localhost:8090/druid/indexer/v1/task
```
我们有三行初始数据，包含一个`animal`维度和`number`指标。
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/updates-select-sql.json http://localhost:8082/druid/v2/sql
```
```
[
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "animal": "tiger",
    "count": 1,
    "number": 100
  },
  {
    "__time": "2018-01-01T03:01:00.000Z",
    "animal": "aardvark",
    "count": 1,
    "number": 42
  },
  {
    "__time": "2018-01-01T03:01:00.000Z",
    "animal": "giraffe",
    "count": 1,
    "number": 14124
  }
]
```
#### 重写初始数据
要重写这份数据，我们可以提交另外一个任务，包含相同的时间段但不同的数据。

`examples/updates-overwrite-index.json`配置会在`updates-tutorial`datasource执行重写。

注意这个任务从`examples/updates-data2.json`读取输入数据，`appendToExisting`也设置为`false`(表示这个一个重写动作)。

提交任务：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/updates-overwrite-index.json http://localhost:8090/druid/indexer/v1/task
```
当重写任务完成，Druid加载完新segment，`tiger`行变成了`lion`, `aardvark`行改变了`number`, `giraffe`被替换掉。这可能需要几分钟更换才会生效。
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/updates-select-sql.json http://localhost:8082/druid/v2/sql
```
```
[
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "animal": "lion",
    "count": 1,
    "number": 100
  },
  {
    "__time": "2018-01-01T03:01:00.000Z",
    "animal": "aardvark",
    "count": 1,
    "number": 9999
  },
  {
    "__time": "2018-01-01T04:01:00.000Z",
    "animal": "bear",
    "count": 1,
    "number": 111
  }
]
```
### 添加数据
`examples/updates-append-index.json`任务配置从`examples/updates-data3.json`读取数据，并添加到`updates-tutorial`datasource。此时`appendToExisting`设置为`true`。

提交任务：
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/updates-append-index.json http://localhost:8090/druid/indexer/v1/task
```
当新数据加载完，我们可以看到在`octopus`之后额外的两行。注意新的`bear`，`number`等于`222`的那行，没有跟之前的`bear-111`行rollup，那是因为新的数据会存放在一个另外一个segment。两行`lion`也是同样的道理。
```
[
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "animal": "lion",
    "count": 1,
    "number": 100
  },
  {
    "__time": "2018-01-01T03:01:00.000Z",
    "animal": "aardvark",
    "count": 1,
    "number": 9999
  },
  {
    "__time": "2018-01-01T04:01:00.000Z",
    "animal": "bear",
    "count": 1,
    "number": 111
  },
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "animal": "lion",
    "count": 1,
    "number": 300
  },
  {
    "__time": "2018-01-01T04:01:00.000Z",
    "animal": "bear",
    "count": 1,
    "number": 222
  },
  {
    "__time": "2018-01-01T05:01:00.000Z",
    "animal": "mongoose",
    "count": 1,
    "number": 737
  },
  {
    "__time": "2018-01-01T06:01:00.000Z",
    "animal": "snake",
    "count": 1,
    "number": 1234
  },
  {
    "__time": "2018-01-01T07:01:00.000Z",
    "animal": "octopus",
    "count": 1,
    "number": 115
  },
  {
    "__time": "2018-01-01T09:01:00.000Z",
    "animal": "falcon",
    "count": 1,
    "number": 1241
  }
]
```
如果我们执行一个GroupBy查询`select *`，我们可以看到之前分开的`lion`和`bear`会合并到一起。

`select __time, animal, SUM("count"), SUM("number") from "updates-tutorial" group by __time, animal;`
```
curl -X 'POST' -H 'Content-Type:application/json' -d @examples/updates-groupby-sql.json http://localhost:8082/druid/v2/sql
```
```
[
  {
    "__time": "2018-01-01T01:01:00.000Z",
    "animal": "lion",
    "EXPR$2": 2,
    "EXPR$3": 400
  },
  {
    "__time": "2018-01-01T03:01:00.000Z",
    "animal": "aardvark",
    "EXPR$2": 1,
    "EXPR$3": 9999
  },
  {
    "__time": "2018-01-01T04:01:00.000Z",
    "animal": "bear",
    "EXPR$2": 2,
    "EXPR$3": 333
  },
  {
    "__time": "2018-01-01T05:01:00.000Z",
    "animal": "mongoose",
    "EXPR$2": 1,
    "EXPR$3": 737
  },
  {
    "__time": "2018-01-01T06:01:00.000Z",
    "animal": "snake",
    "EXPR$2": 1,
    "EXPR$3": 1234
  },
  {
    "__time": "2018-01-01T07:01:00.000Z",
    "animal": "octopus",
    "EXPR$2": 1,
    "EXPR$3": 115
  },
  {
    "__time": "2018-01-01T09:01:00.000Z",
    "animal": "falcon",
    "EXPR$2": 1,
    "EXPR$3": 1241
  }
]
```
