转换配置允许Druid在导入数据是对输入数据过滤和转换

### 语法
如下:
```
"transformSpec": {
  "transforms: <List of transforms>,
  "filter": <filter>
}
```

配置项 | 描述 | 必须
---- | ---- | ----
transforms | 作用于输入数据的转换方式 | 否
filter | 只有通过这个过滤器的行会被导入 | 否

### Transforms
`transforms`允许用户指定一个列转换方式集合，作用在输入数据上。

转换器`Transforms`允许给输入数据添加新的字段。每个转化有一个名称`name`(新字段的名称)，可以在`DimensionSpecs`，`AggregatorFactories`等配置引用。

一个转换可以当做一个**行方法**，输入一整段行，输入一个列值。

如果一个转换和输入的某个字段名称相同，这个转换会遮蔽掉原来的字段。转换的新字段仍然可以指向他们遮蔽的那个旧字段。通常用来就地转换。

转换器会有一些限制。他们只允许转换输入数据真实存在的字段，也就是不能二次转换。然后也不能删除字段，只能添加。但是其实可以用一个只有null的字段覆盖掉一个字段，然后这个字段就相当于被删除了。

注意转换发生在过滤之前。

#### 转换公式
目前Druid只支持一种转换，公式转换

转换公式语法如下:
```
{
  "type": "expression",
  "name": <output field name>,
  "expression": <expr>
}
```

配置项 | 描述 | 必须
---- | ---- | ----
name | 公式转化输出的字段名 | 是
expression | 作用在输入数据行的[公式](/TODO)，输出一个值 | 否

例如下面的公式转换，给所有`page`列的值前面加上`foo`，然后输出到新创建的`fooPage`列。
```
    {
      "type": "expression",
      "name": "fooPage",
      "expression": "concat('foo' + page)"
    }
```

### Filtering
`transformSpec`允许Druid导入前过滤数据。没通过过滤器`filter`的行不会被导入。

所有的Druid常规[filter](/TODO)都适用。

注意过滤发生在转换之后，因此如果使用了转换，过滤可以针对转换后的行而不是原来的行。

例如下面的过滤只导入`country`列值为`United States`的行。
```
"filter": {
  "type": "selector",
  "dimension": "country",
  "value": "United States"
}
```

