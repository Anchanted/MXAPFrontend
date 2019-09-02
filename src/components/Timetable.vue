<template>
  <table id="timetable" border="1" cellpadding="0" cellspacing="0" 
    @touchstart="ontouchstart"
    @touchmove="ontouchmove"
    @touchend="ontouchend">
    <thead>
      <tr>
        <th></th>
        <th>Mon</th>
        <th>Tue</th>
        <th>Wed</th>
        <th>Thu</th>
        <th>Fri</th>
        <th>Sat</th>
        <th>Sun</th>
      </tr>
    </thead>
    <tbody id="tableBody">
      <tr>
        <td rowspan="2">9AM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">10AM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">11AM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">12PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">1PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">2PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">3PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">4PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">5PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">6PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">7PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td rowspan="2">8PM</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="display:none"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  props: {
    lessons: {
      type: Array,
      required: true,
      default: () => []
    },
    modalMove: Boolean
  },
  data() {
    return {
      lessonList: [],
    }
  },
  methods: {
    renderLessons: function () {
      const tb = document.getElementById('tableBody');    // table 的 id
      const rows = tb.rows;                           // 获取表格所有行

      this.lessonList.forEach(e => {
        const day = e.day;
        const startTime = e.startTime;
        const endTime = e.endTime;
        const duration = (endTime-startTime)*2;
        const startRow = (startTime-9)*2;
        // console.log(startRow);

        rows[startRow].cells[day].setAttribute("class", "lesson");
        rows[startRow].cells[day].setAttribute("rowspan", duration+"");
        rows[startRow].cells[day].innerHTML=e.moduleCode.slice(0,3)+'<br/>'+e.moduleCode.slice(3)
        // rows[startRow].cells[day].setAttribute("title", e.moduleCode+'<br/>'+e.name+'<br/>'+e.staff+'<br/>'+this.calculateWeeks(e.week))
        rows[startRow].cells[day].setAttribute("title", `${e.moduleCode}\n${e.name}\n${e.staff}\n${this.calculateWeeks(e.week)}`)
        for (let i = 1; i<duration; i++){
          rows[startRow+i].cells[day].setAttribute("style", "display:none");
        }
      });
      // this.$emit('renderFinished', true);
    },

    clearLessons: function () {
      const tb = document.getElementById('tableBody');    // table 的 id
      const rows = tb.rows;                           // 获取表格所有行

      this.lessonList.forEach(function(e){
        const day = e.day;
        const startTime = e.startTime;
        const endTime = e.endTime;
        const duration = (endTime-startTime)*2;
        const startRow = (startTime-9)*2;

        rows[startRow].cells[day].removeAttribute("class");
        rows[startRow].cells[day].removeAttribute("rowspan");
        rows[startRow].cells[day].innerHTML="";
        for (let i = 1; i<duration; i++){
          rows[startRow+i].cells[day].removeAttribute("style");
        }
      });
    },

    calculateWeeks (weekStr) {
      const totalWeek = 14
      if (weekStr) {
        const weekArr = weekStr.split(',').map(i => parseInt(i))
        weekArr.sort((a,b) => a-b)

        let newWeekStr = ''
        let startWeekNum
        for (let i = 0; i < weekArr.length; i++) {
          if (i === 0) {
            startWeekNum = weekArr[i]
            newWeekStr += startWeekNum
          } else {
            if (weekArr[i] - weekArr[i-1] > 1) {
              if (weekArr[i-1] !== startWeekNum) newWeekStr += '-' + weekArr[i-1]
              newWeekStr += ', '
              startWeekNum = weekArr[i]
              newWeekStr += startWeekNum
            } else if (i === weekArr.length - 1) newWeekStr += '-' + weekArr[i]
          }
        }
        return newWeekStr
      }
    },

    ontouchstart (e) {
      this.move = false
    },

    ontouchmove (e) {
      this.move = true
    },

    ontouchend (e) {
      if (!this.move) {
        const node = e.target
        if (node.className === 'lesson') {
          if ( e && e.stopPropagation ) e.stopPropagation()
          else window.event.cancelBubble = true
          alert(node.title)
        }
      }
    }
  },

  mounted () {
    this.clearLessons()
    this.lessonList = this.lessons;
    this.renderLessons()
  },

  watch: {
    lessons: function(val) {
      this.clearLessons()
      this.lessonList = val
      this.renderLessons()
    }
  }
}
</script>

<style>
table
{
    border-collapse: collapse;
    text-align: center;
    table-layout: fixed;
    /* width: 700px; */
    width: 100%;
    height: auto;
    font-size: 3vw;
}
table td, table th
{
    border: 1px solid #cad9ea;
    color: #666;
    height: 8vw;
    /* width: auto; */
    width: 12.5%;
    position: relative !important;
}
table thead th
{
    background-color: #CCE8EB;
    /* width: 12.5%; */
    /* text-align: center; */
}
/* table tr 
{
    width: auto;
    height: 20vw;
} */
table tr:nth-child(odd)
{
    background: #fff;
}
table tr:nth-child(even)
{
    background: #F5FAFA;
}
.lesson
{
	background: #ddd;
}
</style>
